import os
# Fix Masters.jsx
with open('web/src/pages/Masters.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("          )\n        }\n        }\n      </div>", "          )\n        }\n      </div>")

with open('web/src/pages/Masters.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('web/src/pages/ProjectForm.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(540, min(560, len(lines))):
    try:
        print(f"{i+1}: {lines[i].rstrip()}")
    except:
        pass
