#!/usr/bin/env bash
# สำรองฐานข้อมูล PostgreSQL (Supabase) เป็นไฟล์ .sql.gz
#
# ใช้ตอนรันมือ:  DATABASE_URL="postgresql://..." ./scripts/backup-db.sh [โฟลเดอร์ปลายทาง]
# ถ้าไม่ใส่โฟลเดอร์ จะเก็บที่ ./backups
#
# หมายเหตุ Supabase:
#   - ใช้ "Session pooler" connection string (host ...pooler.supabase.com:5432, user postgres.<ref>)
#     Direct connection เป็น IPv6-only มักต่อไม่ได้จากเครื่องทั่วไป/CI
#   - pg_dump เวอร์ชันต้อง >= เวอร์ชัน server (Supabase = PostgreSQL 15) มิฉะนั้น error
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "✖ ต้องตั้ง env DATABASE_URL ก่อน" >&2
  exit 1
fi

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/posres-$STAMP.sql.gz"

echo "→ กำลัง dump ฐานข้อมูลไปที่ $OUT_FILE"
# --no-owner / --no-acl: กู้คืนข้าม role/instance ได้ง่าย (Supabase ใช้ role เฉพาะ)
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  | gzip -9 > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "✓ สำรองเสร็จ: $OUT_FILE ($SIZE)"
