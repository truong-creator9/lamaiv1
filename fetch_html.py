import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

def fetch_html_structure():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        
        print("--- HTML Title ---")
        stdin, stdout, stderr = client.exec_command("grep -i '<title>' /var/www/lamaiv1/index.html")
        print(stdout.read().decode('utf-8', errors='replace'))
        
        print("--- HTML H1 ---")
        stdin, stdout, stderr = client.exec_command("grep -i -C 2 '<h1' /var/www/lamaiv1/index.html")
        print(stdout.read().decode('utf-8', errors='replace'))
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_html_structure()
