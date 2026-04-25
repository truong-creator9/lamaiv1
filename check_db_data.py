import paramiko

def check_db_data():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("sqlite3 /var/www/lamaiv1/brain.db 'SELECT registration_date FROM customers ORDER BY id DESC LIMIT 1;'")
        print(f"Customer date: {stdout.read().decode().strip()}")
        stdin, stdout, stderr = client.exec_command("sqlite3 /var/www/lamaiv1/brain.db 'SELECT purchase_date FROM orders ORDER BY id DESC LIMIT 1;'")
        print(f"Order date: {stdout.read().decode().strip()}")
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db_data()
