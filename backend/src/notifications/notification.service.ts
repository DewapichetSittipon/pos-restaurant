import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// แจ้งเตือนเหตุการณ์สำคัญไปยังผู้ดูแล (เช่น มีร้านสมัครใหม่รออนุมัติ, มีการจองใหม่)
// รองรับ 2 ช่องทาง เปิดใช้ตาม env ที่ตั้ง — ถ้าไม่ตั้งอะไรเลย = ไม่ส่ง (no-op) ไม่ error
//
//   LINE (Messaging API push):
//     LINE_CHANNEL_ACCESS_TOKEN  — channel access token (long-lived)
//     LINE_TARGET_ID             — userId/groupId ปลายทางที่จะ push หา
//
//   Email (SMTP):
//     SMTP_URL                   — เช่น smtps://user:pass@smtp.gmail.com:465
//                                  (หรือใช้ SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS แยกก็ได้)
//     SMTP_FROM                  — อีเมลผู้ส่ง
//     ALERT_EMAIL_TO             — อีเมลปลายทาง (คั่นหลายอันด้วย comma)
//
// ออกแบบให้ "ไม่มีวันทำ flow หลักล่ม": ทุก error ถูกจับและ log เท่านั้น
@Injectable()
export class NotificationService {
  private readonly logger = new Logger('Notification');
  private readonly mailer = this.buildMailer();

  private buildMailer(): nodemailer.Transporter | null {
    const url = process.env.SMTP_URL;
    const host = process.env.SMTP_HOST;
    if (!url && !host) return null;
    try {
      return url
        ? nodemailer.createTransport(url)
        : nodemailer.createTransport({
            host,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: Number(process.env.SMTP_PORT ?? 587) === 465,
            auth:
              process.env.SMTP_USER && process.env.SMTP_PASS
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined,
          });
    } catch (err) {
      this.logger.error(`สร้าง SMTP transport ไม่สำเร็จ: ${String(err)}`);
      return null;
    }
  }

  // จุดเข้าหลัก — ส่งข้อความแจ้งเตือนออกทุกช่องทางที่ตั้งค่าไว้ (รอจบแบบ best-effort)
  async notify(subject: string, message: string): Promise<void> {
    await Promise.allSettled([
      this.sendLine(`${subject}\n${message}`),
      this.sendEmail(subject, message),
    ]);
  }

  private async sendLine(text: string): Promise<void> {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const to = process.env.LINE_TARGET_ID;
    if (!token || !to) return; // ไม่ตั้งค่า = ข้าม
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
      });
      if (!res.ok) {
        this.logger.error(`LINE push ล้มเหลว ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error(`LINE push error: ${String(err)}`);
    }
  }

  private async sendEmail(subject: string, message: string): Promise<void> {
    const to = process.env.ALERT_EMAIL_TO;
    if (!this.mailer || !to) return; // ไม่ตั้งค่า = ข้าม
    try {
      await this.mailer.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        text: message,
      });
    } catch (err) {
      this.logger.error(`ส่งอีเมลแจ้งเตือนไม่สำเร็จ: ${String(err)}`);
    }
  }
}
