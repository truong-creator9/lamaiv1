import paramiko

def query_db():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        
        # Query agents
        stdin, stdout, stderr = client.exec_command('docker exec -i agent-postgres-1 psql -U goclaw -d goclaw -c "\\dt"')
        out = stdout.read().decode('utf-8', errors='replace')
        print("STDOUT:", out)
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    query_db()
