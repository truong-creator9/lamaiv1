import paramiko

def check_db():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        
        print("--- TABLES ---")
        stdin, stdout, stderr = client.exec_command("sqlite3 /var/www/lamaiv1/brain.db '.tables'")
        print(stdout.read().decode().strip())
        
        print("\n--- CUSTOMERS SAMPLE ---")
        stdin, stdout, stderr = client.exec_command("sqlite3 /var/www/lamaiv1/brain.db 'SELECT * FROM customers ORDER BY id DESC LIMIT 1;'")
        print(stdout.read().decode().strip())
        
        print("\n--- ORDERS SAMPLE ---")
        stdin, stdout, stderr = client.exec_command("sqlite3 /var/www/lamaiv1/brain.db 'SELECT * FROM orders ORDER BY id DESC LIMIT 1;'")
        print(stdout.read().decode().strip())
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
