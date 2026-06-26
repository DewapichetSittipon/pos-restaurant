import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// อัปโหลดรูปไป Supabase Storage (ถาวร) แทน disk ของ Render (ephemeral)
@Injectable()
export class StorageService {
  private clientInstance: SupabaseClient | null = null;
  private bucketReady = false;
  private readonly bucket = process.env.SUPABASE_BUCKET ?? 'menu-images';

  // สร้าง client แบบ lazy — local dev ที่ไม่ตั้ง env จะไม่ล้มตอน start (ล้มเฉพาะตอนอัปโหลด)
  private client(): SupabaseClient {
    if (this.clientInstance) return this.clientInstance;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new InternalServerErrorException(
        'ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
      );
    }
    this.clientInstance = createClient(url, key, {
      auth: { persistSession: false },
    });
    return this.clientInstance;
  }

  // สร้าง bucket (public) ครั้งแรกถ้ายังไม่มี — เรียกก่อนอัปโหลด
  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    const { error } = await this.client().storage.createBucket(this.bucket, {
      public: true,
    });
    // มีอยู่แล้ว = ไม่ใช่ error จริง
    if (error && !/already exists|exists/i.test(error.message)) {
      throw new InternalServerErrorException(
        `สร้าง bucket ไม่สำเร็จ: ${error.message}`,
      );
    }
    this.bucketReady = true;
  }

  // อัปโหลด buffer แล้วคืน public URL (เก็บลง imageUrl)
  async upload(
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.ensureBucket();
    const { error } = await this.client()
      .storage.from(this.bucket)
      .upload(path, buffer, { contentType, upsert: true });
    if (error) {
      throw new InternalServerErrorException(
        `อัปโหลดรูปไม่สำเร็จ: ${error.message}`,
      );
    }
    const { data } = this.client().storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // ลบรูปจาก storage (best-effort — รับ public URL ที่เก็บใน DB)
  async remove(imageUrl: string | null): Promise<void> {
    const path = this.pathFromUrl(imageUrl);
    if (!path) return;
    await this.client()
      .storage.from(this.bucket)
      .remove([path])
      .catch(() => undefined);
  }

  // ดึง path ภายใน bucket จาก public URL: .../object/public/<bucket>/<path>
  private pathFromUrl(url: string | null): string | null {
    if (!url) return null;
    const marker = `/object/public/${this.bucket}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }
}
