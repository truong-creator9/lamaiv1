import paramiko

HOST = '103.97.127.35'
PORT = 2018
USER = 'root'
PASS = 'T3oyy2CFDL'

def run(cmd, timeout=30):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=20)
    _, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('ascii', 'ignore')
    err = stderr.read().decode('ascii', 'ignore')
    c.close()
    return out + err

DATA_VOL_PATH = "/var/lib/docker/volumes/agent_goclaw-data/_data"
print("=== FILE SIZE ===")
print(run(f'ls -l {DATA_VOL_PATH}/config.json'))

print("\n=== FILE CONTENT (RAW ASCII) ===")
# Doc tung dong va in ra de debug
print(run(f'cat {DATA_VOL_PATH}/config.json'))

print("\n=== DOCKER ENV CHECK ===")
# Xem environment bien GOCLAW_CONFIG tro di dau
print(run('docker inspect agent-goclaw-1 --format "{{.Config.Env}}"'))
