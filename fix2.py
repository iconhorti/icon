import os

# 1. Fix ProjectDetail.css imports
comps = [
  'web/src/components/ProjectDetail/ProjectItemsCard.jsx',
  'web/src/components/ProjectDetail/TeamAssignmentCard.jsx',
  'web/src/components/ProjectDetail/StageActionPanel.jsx'
]
for c in comps:
  if os.path.exists(c):
    with open(c, 'r', encoding='utf-8') as f:
      content = f.read()
    content = content.replace("import './ProjectDetail.css';", "import '../../pages/ProjectDetail.css';")
    # also remove any dangling `<Pagination ... />` if it didn't match the regex before
    with open(c, 'w', encoding='utf-8') as f:
      f.write(content)


# 2. Fix Masters.jsx dangling } at line 607
# Actually, the error in Masters.jsx is at the end of the location render table block.
# Let's fix the unbalanced braces in Masters.jsx.
with open('web/src/pages/Masters.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
# The issue is near line 607.
# Earlier, I replaced `{loading ? ... : ( <AgTable ... /> ) }` and left a dangling brace somewhere, or deleted too much.
# Let's print out lines 600-610 to see.
for i in range(595, min(615, len(lines))):
    print(f"{i+1}: {lines[i].rstrip()}")
