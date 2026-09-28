import re

file_path = "C:/Users/ELYSIUM/Documents/VSCODE/learnmate/frontend/src/api/questions.ts"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Fix getPYQMetadata generic
text = text.replace(
    "const response = await apiClient.get('/questions/pyq-meta', { params });",
    "const response = await apiClient.get<{\n      years: number[];\n      shifts: string[];\n      papers: { year: number; shift: string; count: number }[];\n    }>('/questions/pyq-meta', { params });"
)

# Fix getPYQIndex generic
text = text.replace(
    "const response = await apiClient.get('/questions/pyq-index', {",
    "const response = await apiClient.get<PyqIndexItem[]>('/questions/pyq-index', {"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

