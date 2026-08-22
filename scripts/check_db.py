import sqlite3
conn = sqlite3.connect('ecdict.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
print('Tables:', tables)
for t in tables:
    cursor.execute(f"SELECT sql FROM sqlite_master WHERE name='{t}'")
    print(f'\n--- {t} ---')
    print(cursor.fetchone()[0])
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    print(f'Row count: {cursor.fetchone()[0]}')
    cursor.execute(f"PRAGMA table_info({t})")
    cols = cursor.fetchall()
    print('Columns:', [(c[1], c[2]) for c in cols])
conn.close()
