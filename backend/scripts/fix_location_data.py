"""
Fix DB: Clean stray test states and ensure Maharashtra has state_id=1
linked to all existing districts.
"""
import sqlite3

conn = sqlite3.connect('icon_app.db')
c = conn.cursor()

# Current state
print("=== BEFORE ===")
print("States:", c.execute("SELECT id, name FROM states ORDER BY id").fetchall())
print("Districts (first 5):", c.execute("SELECT id, name, state_id FROM districts LIMIT 5").fetchall())

# 1. Ensure we have Maharashtra as id=1
mh = c.execute("SELECT id FROM states WHERE name='Maharashtra'").fetchone()
if mh:
    mh_id = mh[0]
    print(f"Maharashtra exists at id={mh_id}")
    # If it's not id=1, rename id=1 to Maharashtra
    if mh_id != 1:
        # Update all districts referencing mh_id to point to 1
        c.execute("UPDATE districts SET state_id=1 WHERE state_id=?", (mh_id,))
        c.execute("DELETE FROM states WHERE id=?", (mh_id,))
else:
    # Rename state id=1 to Maharashtra (was either Madhya Pradesh or something else)
    c.execute("UPDATE states SET name='Maharashtra' WHERE id=1")
    print("Renamed state id=1 to Maharashtra")

# 2. Ensure all seeded districts (Ahmednagar, Jalgaon, Pune etc.) link to Maharashtra (id=1)
c.execute("UPDATE districts SET state_id=1 WHERE state_id!=1 AND id <= 8")
print("Relinked original 8 districts to Maharashtra (state_id=1)")

# 3. Remove stray test states (K, M, Madhya Pradesh, Rajastan) if they exist
stray_names = ['K', 'M', 'Madhya Pradesh', 'Rajastan', 'T']
for name in stray_names:
    row = c.execute("SELECT id FROM states WHERE name=?", (name,)).fetchone()
    if row:
        sid = row[0]
        if sid == 1:
            continue  # never delete state id=1
        # delete child districts/talukas/villages first handled by cascade? Let's check
        # Manually cascade
        district_ids = [r[0] for r in c.execute("SELECT id FROM districts WHERE state_id=?", (sid,)).fetchall()]
        for did in district_ids:
            taluka_ids = [r[0] for r in c.execute("SELECT id FROM talukas WHERE district_id=?", (did,)).fetchall()]
            for tid in taluka_ids:
                c.execute("UPDATE person SET village_id=NULL WHERE village_id IN (SELECT id FROM villages WHERE taluka_id=?)", (tid,))
                c.execute("DELETE FROM villages WHERE taluka_id=?", (tid,))
            c.execute("DELETE FROM talukas WHERE district_id=?", (did,))
        c.execute("DELETE FROM districts WHERE state_id=?", (sid,))
        c.execute("DELETE FROM states WHERE id=?", (sid,))
        print(f"  Deleted stray state '{name}' (id={sid}) and its children")

# 4. Remove stray "T" district if it was added 
c.execute("DELETE FROM districts WHERE name='T'")

conn.commit()

print("\n=== AFTER ===")
print("States:", c.execute("SELECT id, name FROM states ORDER BY id").fetchall())
print("Districts:", c.execute("SELECT id, name, state_id FROM districts ORDER BY name").fetchall())
conn.close()
print("\nDone — DB cleaned up.")
