# Check if /pyq-index comes BEFORE /{question_id}
import re

with open('app/api/v1/endpoints/questions.py', 'r') as f:
    content = f.read()

# Find all router.get calls with their line positions
pattern = r'@router\.get\(["\']([^"\']+)["\']'
matches = list(re.finditer(pattern, content))

print("Route order in questions.py:")
for m in matches:
    print(f"  Line {content[:m.start()].count(chr(10))+1}: {m.group(1)}")

# Check if pyq-index comes before question_id
pyq_index_pos = None
question_id_pos = None
for i, m in enumerate(matches):
    if m.group(1) == '/pyq-index':
        pyq_index_pos = i
    if m.group(1) == '/{question_id}':
        question_id_pos = i

print()
if pyq_index_pos is not None and question_id_pos is not None:
    if pyq_index_pos < question_id_pos:
        print("✓ CORRECT: /pyq-index is BEFORE /{question_id}")
    else:
        print("✗ WRONG: /pyq-index is AFTER /{question_id} - ORDER IS CRITICAL")
else:
    if pyq_index_pos is None:
        print("✗ MISSING: /pyq-index not found")
    if question_id_pos is None:
        print("✗ MISSING: /{question_id} not found")
