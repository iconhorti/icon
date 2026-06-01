import os
import re

# 1. Fix relative imports and empty JSX parens in subcomponents
comps = [
  'web/src/components/ProjectDetail/ProjectItemsCard.jsx',
  'web/src/components/ProjectDetail/TeamAssignmentCard.jsx',
  'web/src/components/ProjectDetail/StageActionPanel.jsx',
  'web/src/components/ProjectForm/ProjectFormDetails.jsx',
  'web/src/components/ProjectForm/ProjectFormComponents.jsx',
  'web/src/components/ProjectForm/ProjectFormDocuments.jsx',
  'web/src/pages/Documents.jsx'
]

for c in comps:
  if os.path.exists(c):
    with open(c, 'r', encoding='utf-8') as f:
      content = f.read()
    if 'components/Project' in c:
      content = content.replace("from '../", "from '../../")
    content = re.sub(r'&& \(\s*\)', '', content)
    with open(c, 'w', encoding='utf-8') as f:
      f.write(content)

# 2. Fix Masters.jsx syntax error
with open('web/src/pages/Masters.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We replaced the table in Masters with a regex. Let's see if we left an unmatched brace.
# The error was: Unexpected token `}` at line 607.
# And in ProjectForm.jsx at line 548. Let's fix them broadly by doing a regex check or just manually replacing the end of Masters.
# Wait, I can just use a simple regex to fix the dangling && ( ) in Masters as well.
content = re.sub(r'&& \(\s*\)', '', content)
with open('web/src/pages/Masters.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('web/src/pages/ProjectForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'&& \(\s*\)', '', content)
with open('web/src/pages/ProjectForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Syntax fixed")
