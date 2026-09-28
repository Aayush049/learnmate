with open('../frontend/src/api/questions.ts', 'r') as f:
    content = f.read()

content = content.replace("source?: string;", "source?: string;\n  topic_name?: string;\n  subject_name?: string;")

with open('../frontend/src/api/questions.ts', 'w') as f:
    f.write(content)
