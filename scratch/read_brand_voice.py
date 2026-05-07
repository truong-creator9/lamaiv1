import sqlite3
import os
import sys

# Set output encoding to UTF-8 for Vietnamese characters
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r"C:\Users\RENCY3\Desktop\my-brain\Brain.db"

def get_brand_voice():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Query business table
        cursor.execute("SELECT * FROM business;")
        # Fetch columns
        columns = [description[0] for description in cursor.description]
        print(f"Columns: {columns}")
        
        rows = cursor.fetchall()
        for row in rows:
            print("-" * 20)
            for col, val in zip(columns, row):
                print(f"{col}: {val}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_brand_voice()

