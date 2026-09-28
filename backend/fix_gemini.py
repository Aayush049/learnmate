import time
import os
import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
print("Waiting 15 seconds to bypass rate limit...")
time.sleep(15)
print("Executing!")
