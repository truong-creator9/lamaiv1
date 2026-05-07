import os
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from gen_image import generate_image
from gen_caption import generate_text, get_lamai_system_prompt

def exec_v124_ads():
    print("--- DANG SAN XUAT CREATIVE ADS CHO VAY V124 ---")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(current_dir), 'output', 'v124')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    product_info = {
        "name": "Váy đầm thiết kế V124",
        "price": "750.000",
        "usp": "Chất tơ mát, che khuyết điểm, che bụng mỡ, che eo bánh mỳ, che bắp tay to. Mặc đi làm đi chơi đi tiệc đều đẹp",
        "goal": "lead generation cho landing page"
    }

    angles = [
        {"type": "Pain Point", "desc": "Nang lo lang ve 'eo banh my' va 'bap tay to'? V124 sinh ra de giai quyet noi lo do."},
        {"type": "Solution", "desc": "Chat to mat lanh, thiet ke thong minh che moi khuyet diem, nang tu tin tu cong so den bua tiec."},
        {"type": "Social Proof/Status", "desc": "Bien hoa thanh nang tieu thu kieu ky, sang chanh thu hut moi anh nhin voi thiet ke V124."}
    ]

    for i, angle in enumerate(angles, 1):
        print(f"\n>>> Dang gen Bo Creative #{i} ({angle['type']})...")
        
        # 1. Gen Ad Copy
        sys_p = get_lamai_system_prompt(mode="ads")
        user_p = f"Viet Ad Copy cho: {product_info['name']}. Gia: {product_info['price']}. USP: {product_info['usp']}. Goc do: {angle['desc']}. Muc tieu: {product_info['goal']}"
        copy = generate_text(sys_p, user_p)
        
        with open(f"{output_dir}/v124_set{i}.txt", "w", encoding="utf-8") as f:
            f.write(copy)
        print(f"SUCCESS: Da luu Copy vao {output_dir}/v124_set{i}.txt")

        # 2. Gen Image
        image_sys_prompt = "Viet 1 prompt tieng Anh cho DALL-E 3 de tao anh thoi trang cao cap: Mot co gai thanh lich mac mau vay thiet ke V124 mau trang tinh khoi. Cac dac diem bat buoc: Vay kieu wrap dress (co V dap cheo), tay bong ngan (short puff sleeves), chan vay 2 tang xep beo (double-layered ruffled mini skirt), co dinh cac hat ngoc trai nho tinh te doc theo duong dap cheo. Chat lieu vai lua/to mem mai. Boi canh sang chanh, cinematic lighting. Chỉ tra ve prompt."
        img_prompt = generate_text(image_sys_prompt, copy)
        
        save_path = f"{output_dir}/v124_set{i}.png"
        img_result = generate_image(img_prompt, quality="hd", save_path=save_path)
        
        if img_result:
            print(f"SUCCESS: Da luu Anh vao {save_path}")
        else:
            print(f"ERROR: Khong the tao anh cho Bo #{i}. Co the do loi mang hoac bi AI chan.")
        
        print("-" * 50 + "\n")

    print(f"\nDONE! Hoan tat. Nang hay kiem tra thu muc {os.path.abspath(output_dir)} nhe!")

if __name__ == "__main__":
    exec_v124_ads()
