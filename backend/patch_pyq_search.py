import re

file_path = "C:/Users/ELYSIUM/Documents/VSCODE/learnmate/frontend/src/collab/components/pyq/PYQLanding.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Make PYQLanding search more forgiving
replacement = """
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.year?.toString().includes(q)) ||
        (p.shift?.toLowerCase().includes(q)) ||
        ("ssc je civil".includes(q)) ||
        ("paper 1".includes(q)) ||
        ("pyq".includes(q))
      );
    }
"""

text = re.sub(r'if \(searchQuery\.trim\(\)\) \{(.*?)\}', replacement.strip(), text, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

