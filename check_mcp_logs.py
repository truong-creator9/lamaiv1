import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

def check_mcp_logs():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("pm2 logs lamai-mcp --lines 100 --nostream")
        print(stdout.read().decode('utf-8', errors='replace'))
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_mcp_logs()
