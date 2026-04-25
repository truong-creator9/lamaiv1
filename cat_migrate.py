import paramiko

def cat_migrate():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("cat /var/www/lamaiv1/migrate.js")
        print(stdout.read().decode())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    cat_migrate()
