import re

with open('../frontend/src/pages/public/RegisterPage.tsx', 'r') as f:
    content = f.read()

pattern = r'<div className="relative my-6">\s*<div className="absolute inset-0 flex items-center">\s*<div className="w-full border-t border-gray-300"></div>\s*</div>\s*<div className="relative flex justify-center text-sm">\s*<span className="px-2 bg-white text-gray-500">Or sign up with</span>\s*</div>\s*</div>\s*<div className="flex justify-center">\s*<GoogleLogin\s*onSuccess={handleGoogleSuccess}\s*onError={handleGoogleError}\s*useOneTap\s*/>\s*</div>'

blocks = list(re.finditer(pattern, content))
if len(blocks) > 1:
    pos = blocks[1].start()
    end_pos = blocks[1].end()
    content = content[:pos] + content[end_pos:]

with open('../frontend/src/pages/public/RegisterPage.tsx', 'w') as f:
    f.write(content)

