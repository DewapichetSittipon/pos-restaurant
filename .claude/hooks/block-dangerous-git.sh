#!/bin/bash

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# หมายเหตุ: "git push" ธรรมดา "ไม่" ถูกบล็อก เพราะ workflow ของโปรเจกต์นี้คือ
# push เข้า main ตรงๆ เมื่อผู้ใช้สั่ง (ดู CLAUDE.md). บล็อกเฉพาะ force-push
# และคำสั่งที่ทำลายงานแบบกู้ยาก.
DANGEROUS_PATTERNS=(
  "push --force"
  "push -f"
  "git reset --hard"
  "reset --hard"
  "git clean -fd"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git restore \."
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
