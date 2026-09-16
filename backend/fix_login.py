import re

with open('../frontend/src/pages/public/LoginPage.tsx', 'r') as f:
    content = f.read()

# Remove the duplicate block inside the final div
pattern = r'<div className="relative my-6">\s*<div className="absolute inset-0 flex items-center">\s*<div className="w-full border-t border-gray-300"></div>\s*</div>\s*<div className="relative flex justify-center text-sm">\s*<span className="px-2 bg-white text-gray-500">Or continue with</span>\s*</div>\s*</div>\s*<div className="flex justify-center">\s*<GoogleLogin\s*onSuccess={handleGoogleSuccess}\s*onError={handleGoogleError}\s*useOneTap\s*/>\s*</div>'

# find instances
blocks = list(re.finditer(pattern, content))
if len(blocks) > 1:
    # replace the second occurrence with empty string
    pos = blocks[1].start()
    content = content[:pos] + content[pos + len(blocks[1].group(0)):]

with open('../frontend/src/pages/public/LoginPage.tsx', 'w') as f:
    f.write(content)

