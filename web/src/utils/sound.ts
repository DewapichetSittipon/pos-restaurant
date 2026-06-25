// เสียงเตือนด้วย WebAudio (ไม่ต้องมีไฟล์เสียง) — ดังและเร่งด่วนกว่า beep เดิม
let ctx: AudioContext | null = null;

interface Tone {
  freq: number;
  start: number; // วินาทีนับจากตอนเริ่มเล่น
  dur: number;
}

function play(tones: Tone[], volume: number): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; // คลื่นเหลี่ยม = แหลม เด่น ตัดผ่านเสียงร้านได้
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = t.freq;
      const s = now + t.start;
      gain.gain.setValueAtTime(0.0001, s);
      gain.gain.exponentialRampToValueAtTime(volume, s + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, s + t.dur);
      osc.start(s);
      osc.stop(s + t.dur);
    }
  } catch {
    // เบราว์เซอร์บล็อก autoplay ก่อน user interact — เงียบไว้
  }
}

// คำขอจากโต๊ะ (เรียกพนักงาน/เช็คบิล) — สัญญาณด่วน 4 จังหวะสองโทนสลับ ดังชัด
export function alarmService(): void {
  play(
    [
      { freq: 988, start: 0, dur: 0.16 },
      { freq: 740, start: 0.19, dur: 0.16 },
      { freq: 988, start: 0.38, dur: 0.16 },
      { freq: 740, start: 0.57, dur: 0.24 },
    ],
    0.6,
  );
}

// ออเดอร์ใหม่ — โทนคู่ไล่ขึ้น เด่นแต่เบากว่าคำขอเล็กน้อย
export function alarmOrder(): void {
  play(
    [
      { freq: 660, start: 0, dur: 0.14 },
      { freq: 988, start: 0.16, dur: 0.26 },
    ],
    0.5,
  );
}
