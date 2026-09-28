import re

with open('app/api/v1/endpoints/questions.py', 'r') as f:
    content = f.read()

# For get_questions
replacement1 = """            year=q.year,
            shift=q.shift,
            source=q.source,
            topic_name=q.topic.name if q.topic else None,
            subject_name=q.topic.chapter.subject.name if q.topic and q.topic.chapter and q.topic.chapter.subject else None,
            options=[schemas.QuestionOptionResponse("""

content = content.replace("""            year=q.year,
            shift=q.shift,
            source=q.source,
            options=[schemas.QuestionOptionResponse(""", replacement1)

# For get_question_detail
replacement2 = """        year=question.year,
        shift=question.shift,
        source=question.source,
        topic_name=question.topic.name if question.topic else None,
        subject_name=question.topic.chapter.subject.name if question.topic and question.topic.chapter and question.topic.chapter.subject else None,
        options=[schemas.QuestionOptionResponse("""

content = content.replace("""        year=question.year,
        shift=question.shift,
        source=question.source,
        options=[schemas.QuestionOptionResponse(""", replacement2)

with open('app/api/v1/endpoints/questions.py', 'w') as f:
    f.write(content)

