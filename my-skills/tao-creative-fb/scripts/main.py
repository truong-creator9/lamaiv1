import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
import argparse
import json
import re
import datetime
import subprocess
import gen_caption as gc
import gen_image as gi
import post_facebook as pf

def log(msg):
    print(msg, flush=True)

def make_writable(path):
    try:
        os.chmod(path, 0o777)
    except Exception:
        pass

def load_cache(cache_file):
    with open(cache_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_cache(cache_file, data):
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    make_writable(cache_file)

def parse_ideas(ideas_raw):
    ideas = []
    current = []
    for line in ideas_raw.strip().split('\n'):
        s = line.strip().lstrip('*').strip()
        if re.match(r'^[123][\.:\)]', s) and current:
            ideas.append('\n'.join(current))
            current = [line.strip()]
        elif re.match(r'^[123][\.:\)]', s):
            current = [line.strip()]
        elif current:
            current.append(line.strip())
    if current:
        ideas.append('\n'.join(current))
    while len(ideas) < 3:
        ideas.append(f"Y tuong {len(ideas)+1}")
    return ideas

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=[
        'prepare',      # CRON: gen 3 ideas + 3 captions (text only, ~20s). Spawns bg image gen.
        'post',         # CRON: post chosen idea to Facebook (~5-15s if image ready)
        '_bg_gen_image', # Internal: background image generation (spawned by prepare)
        # Legacy
        'ideas', 'content', 'content_cached', 'caption_only',
        'image', 'post_cached', 'autopost', 'ads',
    ], required=True)
    parser.add_argument('--topic',  default='')
    parser.add_argument('--index',  type=int, help='1, 2, or 3')
    parser.add_argument('--idea',       help='legacy')
    parser.add_argument('--caption',    help='legacy')
    parser.add_argument('--image_path', help='legacy')
    parser.add_argument('--prompt',     help='legacy')
    args = parser.parse_args()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir  = os.path.dirname(current_dir)
    output_dir  = os.path.join(parent_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)
    make_writable(output_dir)
    cache_file = os.path.join(output_dir, 'ideas_cache.json')

    log(f"--- MODE: {args.mode} ---")

    # ═══════════════════════════════════════════════════════════════════
    # MODE: PREPARE [CRON - ~20s, well under 60s exec timeout]
    # Generates 3 ideas + 3 captions (text only).
    # Spawns background subprocess for 1 shared image (30-60s).
    # Agent reads stdout and sends ALL 3 captions to user via Telegram.
    # ═══════════════════════════════════════════════════════════════════
    if args.mode == 'prepare':
        today = datetime.date.today()
        today_str = today.strftime('%Y%m%d')

        default_topics = [
            "Phong cach cong so sang trong cho nang Aspiring Girl",
            "Che khuyet diem tinh te - bi quyet thoi trang cua quy co thong thai",
            "Trang phuc da nang 3-in-1: di lam - di tiec - di choi deu dep",
            "Ve dep tu tin cua nguoi phu nu hien dai chon LAMAI",
            "Thiet ke cao cap gia tam trung - LAMAI danh cho nang",
        ]
        topic = args.topic if args.topic else default_topics[today.toordinal() % len(default_topics)]
        log(f"Topic: {topic}")

        # ── Step 1: Gen 3 ideas (text, ~5s) ──────────────────────────
        sys_ideas = (
            "Ban la chuyen gia noi dung LAMAI. De xuat 3 y tuong bai dang Facebook Page. "
            "Moi y gom: Tieu de ngan gon + Angle 1 dong. Danh so 1, 2, 3."
        )
        ideas_raw = gc.generate_text(sys_ideas, f"Chu de: {topic}")
        if not ideas_raw:
            log("ERROR: Khong the gen ideas"); return
        log("[OK] 3 ideas generated")
        ideas = parse_ideas(ideas_raw)

        # ── Step 2: Gen 3 captions (text, ~15s total) ─────────────────
        sys_caption = gc.get_lamai_system_prompt(mode="organic")
        captions = []
        for i, idea_text in enumerate(ideas[:3], 1):
            log(f"[CAP {i}/3] Generating caption...")
            caption = gc.generate_text(sys_caption, f"Viet caption hoan chinh cho y tuong: {idea_text}")
            if not caption:
                caption = f"Caption cho y tuong {i} - LAMAI thoi trang cao cap"
            captions.append(caption)
            log(f"[CAP {i}/3] Done ({len(caption)} chars)")

        # ── Step 3: Save cache (no image yet) ─────────────────────────
        today_img = os.path.join(output_dir, f"idea_{today_str}_shared.png")
        prepared = [
            {
                "index":      i + 1,
                "idea_text":  ideas[i],
                "caption":    captions[i],
                "image_path": today_img,  # will be created by background process
            }
            for i in range(3)
        ]
        cache = {
            "date":     today_str,
            "topic":    topic,
            "prepared": prepared,
            "image_ready": False,
        }
        save_cache(cache_file, cache)
        log("[OK] Cache saved (image pending)")

        # ── Step 4: Spawn background image generation ──────────────────
        log_path = os.path.join(output_dir, 'gen_image.log')
        try:
            subprocess.Popen(
                ['python3', os.path.abspath(__file__), '--mode', '_bg_gen_image'],
                stdout=open(log_path, 'w', encoding='utf-8'),
                stderr=subprocess.STDOUT,
                close_fds=True,
            )
            log(f"[OK] Image generation started in background")
        except Exception as e:
            log(f"[WARN] Could not start bg image gen: {e}")

        # ── Step 5: Print structured output for agent ──────────────────
        print("\n" + "="*60)
        print("=== 3 Y TUONG HOM NAY ===")
        print("="*60)
        for i, idea in enumerate(ideas[:3], 1):
            title = idea.split('\n')[0]
            print(f"\n{i}. {title}")

        print("\n" + "="*60)
        print("=== CAPTIONS (AGENT: copy nguyen van vao tin nhan cho Nang) ===")
        print("="*60)
        for i, cap in enumerate(captions, 1):
            print(f"\n[YT{i}_CAPTION_START]")
            print(cap)
            print(f"[YT{i}_CAPTION_END]")

        print("\n" + "="*60)
        print("HINH ANH: Dang tao tu dong trong nen (~30-60s)")
        print("="*60)

    # ═══════════════════════════════════════════════════════════════════
    # MODE: _BG_GEN_IMAGE [Internal - spawned by prepare]
    # Generates 1 shared image and updates cache.
    # ═══════════════════════════════════════════════════════════════════
    elif args.mode == '_bg_gen_image':
        if not os.path.exists(cache_file):
            log("ERROR: Cache not found"); return
        cache = load_cache(cache_file)
        prepared = cache.get("prepared", [])
        if not prepared:
            log("ERROR: No prepared data in cache"); return

        today_str = cache.get("date", datetime.date.today().strftime('%Y%m%d'))
        today_img = os.path.join(output_dir, f"idea_{today_str}_shared.png")

        # Use the first idea's topic to generate a versatile image
        first_idea = prepared[0].get("idea_text", "LAMAI thoi trang cao cap Viet Nam")
        sys_img = (
            "You are a luxury fashion photographer for LAMAI Vietnam. "
            "Write a DALL-E 3 English prompt for an editorial fashion photo: "
            "elegant Vietnamese woman, high-end LAMAI outfit, cinematic lighting, Vogue style. "
            "Return ONLY the prompt, no explanation."
        )
        img_prompt = gc.generate_text(sys_img, first_idea)
        img_result = gi.generate_image(
            img_prompt or "Elegant Vietnamese woman in LAMAI luxury fashion, Vogue editorial style, cinematic lighting",
            quality="standard",
            save_path=today_img
        )
        if img_result:
            make_writable(today_img)
            cache["image_ready"] = True
            save_cache(cache_file, cache)
            log(f"[OK] Image saved: {today_img}")
        else:
            log("ERROR: Image generation failed")

    # ═══════════════════════════════════════════════════════════════════
    # MODE: POST --index N [CRON - after user approves]
    # Reads caption from cache, uses pre-generated image, posts to FB.
    # If image not ready yet, generates it now (may take up to 60s).
    # ═══════════════════════════════════════════════════════════════════
    elif args.mode == 'post':
        if not args.index or args.index not in [1, 2, 3]:
            print("Error: --index 1, 2, or 3 required"); return
        if not os.path.exists(cache_file):
            print("Error: Cache missing. Run --mode prepare first."); return

        cache    = load_cache(cache_file)
        prepared = cache.get("prepared", [])
        if args.index > len(prepared):
            print(f"Error: Idea #{args.index} not in cache"); return

        entry   = prepared[args.index - 1]
        caption = entry.get("caption", "")
        img_path = entry.get("image_path", "")

        if not caption:
            print(f"Error: No caption for idea #{args.index}"); return

        # Check if shared image is ready
        if not img_path or not os.path.exists(img_path):
            log("Image not ready yet — generating now (~30-60s)...")
            today_str = cache.get("date", datetime.date.today().strftime('%Y%m%d'))
            img_path = os.path.join(output_dir, f"idea_{today_str}_shared.png")
            first_idea = prepared[0].get("idea_text", "LAMAI thoi trang cao cap")
            sys_img = (
                "You are a luxury fashion photographer for LAMAI Vietnam. "
                "Write a DALL-E 3 English prompt for an editorial fashion photo: "
                "elegant Vietnamese woman, high-end LAMAI outfit, cinematic lighting, Vogue style. "
                "Return ONLY the prompt."
            )
            img_prompt = gc.generate_text(sys_img, first_idea)
            img_result = gi.generate_image(
                img_prompt or "Elegant Vietnamese woman in LAMAI luxury fashion, Vogue editorial style",
                quality="standard",
                save_path=img_path
            )
            if not img_result:
                print("Error: Image generation failed"); return
            make_writable(img_path)
        else:
            log(f"Using pre-generated image: {img_path}")

        log(f"Posting idea #{args.index} to Facebook...")
        result = pf.post_to_facebook(img_path, caption)
        log(f"[OK] Result: {result}")
        print(f"\n=== POST RESULT ===\n{json.dumps(result, ensure_ascii=False, indent=2)}")

    # ═══════════════════════════════════════════════════════════════════
    # LEGACY MODES
    # ═══════════════════════════════════════════════════════════════════
    elif args.mode in ('post_cached', 'content_cached', 'caption_only'):
        if not os.path.exists(cache_file):
            print("Error: Cache missing."); return
        cache = load_cache(cache_file)
        if args.mode == 'post_cached':
            idx = cache.get("selected_index", 1)
            prepared = cache.get("prepared", [])
            if prepared and idx <= len(prepared):
                entry = prepared[idx - 1]
                result = pf.post_to_facebook(entry.get("image_path", ""), entry.get("caption", ""))
            else:
                result = pf.post_to_facebook(cache.get("image_path", ""), cache.get("caption", ""))
            print(json.dumps(result, ensure_ascii=False))
        else:
            idx = args.index or 1
            prepared = cache.get("prepared", [])
            if prepared and idx <= len(prepared):
                entry = prepared[idx - 1]
                print(json.dumps({
                    "status": "ready",
                    "caption": entry["caption"],
                    "image_path": entry.get("image_path", "")
                }, ensure_ascii=False, indent=2))
            else:
                print("Error: No data in cache.")

    elif args.mode == 'ideas':
        today = datetime.date.today()
        today_str = today.strftime('%Y%m%d')
        default_topics = [
            "Phong cach cong so sang trong", "Che khuyet diem tinh te",
            "Trang phuc da nang 3-in-1", "Ve dep tu tin", "Thiet ke cao cap",
        ]
        topic = args.topic if args.topic else default_topics[today.toordinal() % 5]
        ideas = gc.generate_text(
            "Ban la chuyen gia noi dung LAMAI. De xuat 3 y tuong bai dang (moi y: Tieu de + Angle ngan). Danh so 1, 2, 3.",
            f"Chu de: {topic}"
        )
        print(f"\n=== IDEAS ===\n{ideas}")

    elif args.mode == 'autopost':
        today = datetime.date.today()
        today_str = today.strftime('%Y%m%d')
        topics = ["Phong cach cong so", "Che khuyet diem", "Da nang 3in1", "Ve dep tu tin", "Thiet ke cao cap"]
        topic = args.topic if args.topic else topics[today.toordinal() % 5]
        caption = gc.generate_text(gc.get_lamai_system_prompt(mode="organic"), f"Caption cho: {topic}")
        if not caption: return
        img_prompt = gc.generate_text("Write a DALL-E 3 fashion prompt for LAMAI Vietnam. Return ONLY prompt.", caption)
        img_path = os.path.join(output_dir, f"organic_{today_str}.png")
        if not gi.generate_image(img_prompt or "LAMAI fashion", quality="standard", save_path=img_path): return
        make_writable(img_path)
        result = pf.post_to_facebook(img_path, caption)
        print(json.dumps({"status": "success", "fb_result": result}, ensure_ascii=False, indent=2))

    elif args.mode == 'ads':
        today_str = datetime.date.today().strftime('%Y%m%d')
        ads_dir = os.path.join(output_dir, 'ads')
        os.makedirs(ads_dir, exist_ok=True)
        make_writable(ads_dir)
        angles = [
            {"id": 1, "type": "Pain_Point",    "desc": f"Che khuyet diem — {args.topic}"},
            {"id": 2, "type": "Solution_3in1", "desc": f"Da nang 3-in-1 — {args.topic}"},
            {"id": 3, "type": "Status_Luxury", "desc": f"Sang chanh tieu thu — {args.topic}"},
        ]
        for a in angles:
            copy = gc.generate_text(gc.get_lamai_system_prompt(mode="ads"), f"Ad Copy: {a['desc']}")
            if not copy: continue
            p = os.path.join(ads_dir, f"ads_{today_str}_set{a['id']}_{a['type']}.txt")
            with open(p, 'w', encoding='utf-8') as f:
                f.write(copy)
            make_writable(p)
            img_prompt = gc.generate_text("DALL-E 3 luxury fashion ad prompt. Return ONLY prompt.", copy)
            ip = os.path.join(ads_dir, f"ads_{today_str}_set{a['id']}_{a['type']}.png")
            r = gi.generate_image(img_prompt or "luxury fashion", quality="hd", save_path=ip)
            if r: make_writable(ip)
            log(f"Set {a['id']} {a['type']}: copy OK, image {'OK' if r else 'FAILED'}")

    elif args.mode == 'content':
        if not args.idea:
            print("Error: --idea required"); return
        c = gc.generate_text(gc.get_lamai_system_prompt(mode="organic"), f"Caption: {args.idea}")
        print(c)

    elif args.mode == 'image':
        if not args.prompt:
            print("Error: --prompt required"); return
        r = gi.generate_image(args.prompt, save_path=os.path.join(output_dir, 'generated_image.png'))
        if r: make_writable(r)
        print(r)

if __name__ == '__main__':
    main()
