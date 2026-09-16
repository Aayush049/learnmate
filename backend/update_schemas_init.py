with open('app/schemas/__init__.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('from app.schemas.user import '):
        line = line.strip() + ", GoogleLoginRequest\n"
    elif line.strip() == '"TokenResponse",':
        line = '    "TokenResponse",\n    "GoogleLoginRequest",\n'
    new_lines.append(line)

with open('app/schemas/__init__.py', 'w') as f:
    f.write(''.join(new_lines))
