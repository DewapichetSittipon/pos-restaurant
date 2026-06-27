# สำรองและกู้คืนฐานข้อมูล (Backup & Restore)

ระบบนี้เก็บ "ยอดขายจริง" ของร้าน — ถ้า DB หายคือหายถาวร เอกสารนี้คือวิธีสำรองและกู้คืน

## กลยุทธ์สำรอง (สรุป)

| ชั้น | เครื่องมือ | ความถี่ | เก็บที่ไหน |
|------|-----------|---------|-----------|
| 1. Supabase อัตโนมัติ | Supabase Dashboard → Database → Backups | ตามแพ็กเกจ (free = จำกัด) | Supabase |
| 2. GitHub Actions | `.github/workflows/db-backup.yml` (`pg_dump`) | ทุกวัน 02:00 น. (ไทย) | Actions artifact (30 วัน) |
| 3. รันมือ | `scripts/backup-db.sh` | เมื่อต้องการ (ก่อน migrate ใหญ่) | เครื่องตัวเอง |

> Supabase free tier มี backup จำกัดและกู้คืนเองไม่ได้สะดวก — **ชั้นที่ 2 (GitHub Actions) คือ safety net หลัก**

## ตั้งค่าครั้งเดียว

1. ไปที่ GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
2. เพิ่ม secret ชื่อ `DATABASE_URL` = Supabase **Session pooler** connection string
   (Supabase → Project Settings → Database → Connection string → **Session pooler**,
   host `aws-...pooler.supabase.com:5432`, user `postgres.<ref>`)
   - อย่าใช้ Direct connection (IPv6-only, CI ต่อไม่ได้)
3. เปิดหน้า **Actions** → เลือก workflow **DB Backup** → กด **Run workflow** ทดสอบครั้งแรก
4. เมื่อรันเสร็จ จะมี artifact `db-backup-<run_id>` ให้ดาวน์โหลดได้

## สำรองด้วยมือ (เครื่องตัวเอง)

ต้องมี `pg_dump` เวอร์ชัน ≥ 15 (`brew install postgresql@15` บน macOS)

```bash
export DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-...pooler.supabase.com:5432/postgres"
./scripts/backup-db.sh                 # เก็บที่ ./backups/posres-<timestamp>.sql.gz
./scripts/backup-db.sh /path/to/folder # หรือกำหนดโฟลเดอร์เอง
```

## กู้คืน (Restore)

> ⚠️ การ restore จะ **เขียนทับ** ข้อมูลที่มีอยู่ ทำกับฐานข้อมูลเปล่า/ฐานใหม่เท่านั้น เว้นแต่ตั้งใจ rollback

1. ดาวน์โหลดไฟล์ `.sql.gz` (จาก Actions artifact หรือ `./backups`)
2. เตรียม `DATABASE_URL` ของฐานปลายทาง (เช่น Supabase project ใหม่ หรือ Postgres local)
3. กู้คืน:

```bash
gunzip -c posres-20260627-190000.sql.gz | psql "$DATABASE_URL"
```

4. ตรวจความถูกต้อง:

```bash
psql "$DATABASE_URL" -c "select count(*) from bills;"
psql "$DATABASE_URL" -c "select status, count(*) from bills group by status;"
```

5. ชี้ backend ไปฐานใหม่ (อัปเดต `DATABASE_URL` บน Render) แล้ว redeploy

## ทดสอบการกู้คืน (สำคัญ — ทำเป็นระยะ)

backup ที่กู้ไม่ได้ = ไม่มี backup ควรทดลอง restore ลง Postgres local อย่างน้อยทุกไตรมาส:

```bash
docker run -d --name restore-test -e POSTGRES_PASSWORD=test -p 5544:5432 postgres:15
gunzip -c backups/posres-*.sql.gz | psql "postgresql://postgres:test@localhost:5544/postgres"
# ตรวจ count แล้วลบ container ทิ้ง
docker rm -f restore-test
```
