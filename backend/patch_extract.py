import re

with open("extract_verify_questions.py", "r", encoding="utf-8") as f:
    text = f.read()

# Change it so that it sleeps 65 seconds on rate limits instead of 30, and retries 10 times instead of 5
text = text.replace("retries=5", "retries=10")
text = text.replace("time.sleep(30)", "time.sleep(65)")

with open("extract_verify_questions.py", "w", encoding="utf-8") as f:
    f.write(text)
