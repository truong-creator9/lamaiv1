import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
import os
import requests
from openai import OpenAI
from dotenv import load_dotenv

import sys
# Lay duong dan tuyet doi den thu muc chua file script nay
current_dir = os.path.dirname(os.path.abspath(__file__))
# Tim file .env o thu muc cha cua scripts/ (tuc la o thu muc goc cua skill)
env_path = os.path.join(os.path.dirname(current_dir), '.env')
load_dotenv(env_path)

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_image(prompt, quality="standard", size="1024x1024", save_path=None):
    """
    Tạo ảnh bằng OpenAI DALL-E 3.
    save_path: Nếu có, sẽ tải ảnh về và lưu vào đường dẫn này.
    """
    try:
        print(f"DEBUG: Dang tao anh voi prompt: {prompt[:100]}...")
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality=quality,
            n=1,
        )
        image_url = response.data[0].url
        
        if save_path:
            print(f"DEBUG: Dang tai anh ve: {save_path}")
            img_data = requests.get(image_url).content
            with open(save_path, 'wb') as handler:
                handler.write(img_data)
            return save_path
            
        return image_url
    except Exception as e:
        print(f"ERROR: Loi khi tao anh: {e}")
        return None

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", help="Prompt cho DALL-E 3")
    parser.add_argument("--save_path", help="Duong dan luu anh")
    args = parser.parse_args()
    
    if args.prompt:
        res = generate_image(args.prompt, save_path=args.save_path)
        print(res)
    else:
        # Test
        test_prompt = "A high-end luxury fashion studio with a pink pastel dress on a mannequin, elegant lighting, cinematic style, 8k resolution."
        url = generate_image(test_prompt)
        if url:
            print(f"SUCCESS: Anh da tao: {url}")
