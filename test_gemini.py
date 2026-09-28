import google.generativeai as genai
import sys

try:
    genai.configure(api_key="dummy_key_12345")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("hello")
    print(response.text)
except Exception as e:
    print("ERROR:", e)
