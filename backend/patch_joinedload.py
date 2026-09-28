import re

with open('app/api/v1/endpoints/questions.py', 'r') as f:
    content = f.read()

if "orm import joinedload" not in content:
    content = content.replace("from sqlalchemy.orm import Session", "from sqlalchemy.orm import Session, joinedload")

replacement_q = "query = db.query(models.Question).options(joinedload(models.Question.topic).joinedload(models.Topic.chapter).joinedload(models.Chapter.subject))"
if replacement_q not in content:
    content = content.replace("query = db.query(models.Question)", replacement_q, 1)

with open('app/api/v1/endpoints/questions.py', 'w') as f:
    f.write(content)
