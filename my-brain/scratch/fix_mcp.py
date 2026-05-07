import paramiko
import json
import sys

HOST = '103.97.127.35'
PORT = 2018
USER = 'root'
PASS = 'T3oyy2CFDL'

def run(cmd, timeout=30):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=20)
    _, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    # Su dung ascii ignore de tranh loi unicode khi print trong powershell
    out = stdout.read().decode('ascii', 'ignore')
    err = stderr.read().decode('ascii', 'ignore')
    c.close()
    return out + err

print("=== 1. KIEM TRA PM2 (MCP SERVER) ===")
# Dung --no-color de giam thieu ky tu la
print(run('pm2 list --no-color'))

print("\n=== 2. KIEM TRA FILE CONFIG.JSON TRONG VOLUME ===")
DATA_VOL_PATH = "/var/lib/docker/volumes/agent_goclaw-data/_data"
config_content = run(f'cat {DATA_VOL_PATH}/config.json')

if not config_content.strip():
    print("WARNING: config.json trong volume rong. Tim tat ca config.json tren he thong...")
    print(run('find /var/lib/docker/volumes -name "config.json"'))
else:
    print("FOUND config.json. Checking content...")
    try:
        # Lay du lieu JSON thuc su (bo qua debug log neu co)
        if "{" in config_content:
            json_str = config_content[config_content.find("{"):config_content.rfind("}")+1]
            config = json.loads(json_str)
            
            changed = False
            # Check ca mcp_servers va mcpServers
            keys = ["mcp_servers", "mcpServers"]
            for key in keys:
                if key in config and config[key]:
                    for server in config[key]:
                        if "url" in server and "localhost" in server["url"]:
                            old_url = server["url"]
                            server["url"] = server["url"].replace("localhost", "host.docker.internal")
                            print(f"FIXED: Changed MCP URL in '{key}' from {old_url} to {server['url']}")
                            changed = True
            
            if changed:
                new_config = json.dumps(config, indent=2)
                # Ghi ra file tam roi copy vao
                # Dung base64 de truyen du lieu an toan qua SSH tranh loi ky tu dac biet
                import base64
                b64_config = base64.b64encode(new_config.encode('utf-8')).decode('utf-8')
                run(f"echo '{b64_config}' | base64 -d > /tmp/config.json.tmp")
                run(f"cp /tmp/config.json.tmp {DATA_VOL_PATH}/config.json")
                print("SUCCESS: Da cap nhat config.json an toan.")
            else:
                print("No localhost URLs found in config.json.")
        else:
            print("Could not find JSON object in config.json content.")
    except Exception as e:
        print(f"ERROR parsing config: {e}")

print("\n=== 3. RESTART SERVICES ===")
print("Restarting PM2 (MCP)...")
run('pm2 restart all')

print("Restarting GoClaw Container...")
run('docker restart agent-goclaw-1')

print("\n=== 4. VERIFY CONNECTION (Internal) ===")
# Kiem tra xem port 3000 co phan hoi ko
print(run('docker exec agent-goclaw-1 python3 -c "import socket; s=socket.socket(); s.settimeout(2); print(s.connect_ex((\'host.docker.internal\', 3000)))"'))

print("\nDONE!")
