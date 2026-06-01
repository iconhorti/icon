import os
with open('web/src/pages/ProjectForm.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(482, min(500, len(lines))):
    print(f"{i+1}: {lines[i].rstrip()}")
