import paramiko
import sys

def get_logs():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("cat ~/.pm2/logs/lamai-mcp-error.log | tail -n 50")
        sys.stdout.buffer.write(stdout.read())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_logs()
