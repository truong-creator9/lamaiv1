import sqlite3
import io

def dump_table(table_name):
    try:
        conn = sqlite3.connect('brain.db')
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        with io.open(f'{table_name}_dump.txt', 'w', encoding='utf-8') as f:
            for row in rows:
                f.write(str(row) + '\n')
        conn.close()
        print(f"Dumped {table_name} successfully.")
    except Exception as e:
        print(f"Error dumping {table_name}: {e}")

if __name__ == '__main__':
    dump_table('business')
    dump_table('brand_voice')
    dump_table('knowledge')
