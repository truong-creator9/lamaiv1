import paramiko

def check_schema():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("sqlite3 /var/www/lamaiv1/brain.db '.schema'")
        print(stdout.read().decode().strip())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
