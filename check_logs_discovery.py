import paramiko
import sys

def check_logs():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        # Kiểm tra 50 dòng log cuối của cả log out và log error
        print("--- LAST 50 LOGS ---")
        stdin, stdout, stderr = client.exec_command("pm2 logs lamai-mcp --lines 50 --raw --no-color --nostream")
        sys.stdout.buffer.write(stdout.read())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_logs()
