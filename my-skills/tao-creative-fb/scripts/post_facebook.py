import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
import requests
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path    = os.path.join(os.path.dirname(current_dir), '.env')
load_dotenv(env_path)

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def post_to_facebook(image_url, caption):
    page_id    = os.getenv("FB_PAGE_ID")
    page_token = os.getenv("FB_PAGE_TOKEN")
    # Reads DRY_RUN from .env (default: false = thuc su dang bai)
    dry_run    = os.getenv("DRY_RUN", "false").lower() == "true"

    if dry_run:
        print("\n--- [DRY RUN MODE] ---")
        print(f"INFO: Page ID : {page_id}")
        print(f"INFO: Image   : {image_url}")
        print(f"INFO: Caption : {caption[:200]}...")
        print("-----------------------\n")
        return {"status": "dry_run", "message": "DRY_RUN=true — khong dang that"}

    url = f"https://graph.facebook.com/v18.0/{page_id}/photos"

    try:
        if os.path.exists(image_url):
            print(f"INFO: Upload anh tu file: {image_url}")
            with open(image_url, 'rb') as img_file:
                response = requests.post(
                    url,
                    data={"caption": caption, "access_token": page_token},
                    files={"source": img_file},
                    timeout=60,
                )
        else:
            print(f"INFO: Dang anh tu URL: {image_url}")
            response = requests.post(
                url,
                data={"url": image_url, "caption": caption, "access_token": page_token},
                timeout=60,
            )

        res_data = response.json()
        if response.status_code == 200:
            post_id = res_data.get("id", "unknown")
            print(f"SUCCESS: Da dang thanh cong! Post ID: {post_id}")
            return {"status": "success", "id": post_id}
        else:
            print(f"ERROR: Facebook API tra loi: {res_data}")
            return {"status": "error", "message": res_data}

    except Exception as e:
        print(f"ERROR: Loi ket noi: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--img",  help="Duong dan anh hoac URL")
    parser.add_argument("--text", help="Noi dung caption")
    args = parser.parse_args()
    if args.img and args.text:
        print(post_to_facebook(args.img, args.text))
    else:
        print("Cung cap --img va --text de dang bai.")
