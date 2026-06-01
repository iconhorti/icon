import os

# 1. Fix ProjectFormDetails.jsx
with open('web/src/components/ProjectForm/ProjectFormDetails.jsx', 'r', encoding='utf-8') as f:
    det_content = f.read()

# Replace the specific place where it was joined
det_content = det_content.replace(
    "                      })}\n                    </div>\n                  {/* Search input */}",
    "                      })}\n                    </div>\n                  )}\n                  {/* Search input */}"
)

with open('web/src/components/ProjectForm/ProjectFormDetails.jsx', 'w', encoding='utf-8') as f:
    f.write(det_content)

# 2. Fix ProjectFormDocuments.jsx
with open('web/src/components/ProjectForm/ProjectFormDocuments.jsx', 'r', encoding='utf-8') as f:
    doc_content = f.read()

doc_content = doc_content.replace(
    "                    </div>\n                  <div style={{ display: 'grid'",
    "                    </div>\n                  )}\n                  <div style={{ display: 'grid'"
)

with open('web/src/components/ProjectForm/ProjectFormDocuments.jsx', 'w', encoding='utf-8') as f:
    f.write(doc_content)

# 3. Fix ProjectFormComponents.jsx import
with open('web/src/components/ProjectForm/ProjectFormComponents.jsx', 'r', encoding='utf-8') as f:
    comp_content = f.read()

comp_content = comp_content.replace('import LocationPicker from "../../LocationPicker";\n', '')
# also if it uses LocationPicker, it's actually not in components tab.

with open('web/src/components/ProjectForm/ProjectFormComponents.jsx', 'w', encoding='utf-8') as f:
    f.write(comp_content)

print("Fixed")
