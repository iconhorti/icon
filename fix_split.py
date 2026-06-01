import os

with open('web/src/pages/ProjectForm.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Tab 1 remainder: lines 485 to 644 (0-indexed 485 is line 486)
# wait, line 486 is 485 in 0-indexed list
tab1_remainder = "".join(lines[485:645])

# Tab 3 remainder: lines 649 to 788 (0-indexed 649 is line 650)
tab3_remainder = "".join(lines[649:789])

# Append to ProjectFormDetails.jsx
with open('web/src/components/ProjectForm/ProjectFormDetails.jsx', 'r', encoding='utf-8') as f:
    det_content = f.read()

# Remove the ending `  );\n}`
det_content = det_content.replace("  );\n}", "")
det_content += tab1_remainder + "\n  );\n}\n"

with open('web/src/components/ProjectForm/ProjectFormDetails.jsx', 'w', encoding='utf-8') as f:
    f.write(det_content)

# Append to ProjectFormDocuments.jsx
with open('web/src/components/ProjectForm/ProjectFormDocuments.jsx', 'r', encoding='utf-8') as f:
    doc_content = f.read()

doc_content = doc_content.replace("  );\n}\n", "").replace("  );\n}", "")
doc_content += tab3_remainder + "\n  );\n}\n"

with open('web/src/components/ProjectForm/ProjectFormDocuments.jsx', 'w', encoding='utf-8') as f:
    f.write(doc_content)

# Now remove the dangling parts from ProjectForm.jsx
new_pf_lines = lines[:485] + lines[646:649] + lines[789:]
with open('web/src/pages/ProjectForm.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_pf_lines)

print("Fixed the split components!")
