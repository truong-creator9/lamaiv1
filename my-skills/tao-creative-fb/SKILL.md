---
name: tao-creative-fb
description: San xuat noi dung hinh anh va van ban (Organic & Ads) dong bo cho Fanpage LAMAI. Su dung khi can: gen y tuong, tao anh + caption, dang bai len Facebook, hoac tu dong post moi sang.
version: 2.1.0
author: Antigravity
entrypoint: scripts/main.py
---

# Skill: tao-creative-fb

Skill nay giup agent tu dong san xuat noi dung Facebook cho thuong hieu LAMAI.

## Cac mode co san

### MODE: autopost (FULLY AUTOMATIC — dung cho cron sang)

Chay 1 lenh, tu dong hoan toan: gen caption → gen anh → dang Facebook.

```bash
python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode autopost
```

Hoac custom topic:
```bash
python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode autopost --topic "Vay V124 che khuyet diem"
```

**Output JSON:**
```json
{
  "status": "success",
  "topic": "...",
  "caption": "...",
  "image_path": "/app/data/skills-store/tao-creative-fb/7/output/organic_YYYYMMDD.png",
  "fb_result": {"status": "success", "id": "POST_ID"}
}
```

---

### MODE: ads (Gen 3 bo creative cho Ads Manager)

Gen 3 set: Pain_Point + Solution_3in1 + Status_Luxury. Moi set co 1 ad copy (.txt) va 1 anh HD (.png).

```bash
python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode ads --topic "Vay dam thiet ke LAMAI, gia 750k, chat to mat, che khuyet diem"
```

Ket qua luu tai: `/app/data/skills-store/tao-creative-fb/7/output/ads/`

---

### MODE: ideas → content → post (3 buoc thu cong)

```bash
# Buoc 1: Gen 3 y tuong
python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode ideas --topic "chu de"

# Buoc 2: Gen caption tu y tuong chon
python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode content --idea "Y tuong da chon"

# Buoc 3: Dang bai
python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode post --caption "Caption" --image_path "/path/anh.png"
```

---

## Luong tu dong (CRON - moi sang 9h)

Cron `daily-content-fb` tu dong chay `--mode autopost` luc 9h sang moi ngay (Asia/Ho_Chi_Minh).
Khong can can thiep. Agent bao ket qua len Telegram sau khi dang xong.

## Luu y quan trong

- File `.env` nam tai: `/app/data/skills-store/tao-creative-fb/7/.env`
- Output luu tai: `/app/data/skills-store/tao-creative-fb/7/output/`
- `DRY_RUN=false` trong .env nghia la dang THAT len Facebook
- `DRY_RUN=true` trong .env chi in thong tin, khong dang that
- Neu gap loi `ModuleNotFoundError`: Chay `pip install openai requests python-dotenv` truoc
