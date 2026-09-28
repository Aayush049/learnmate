import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from main import app

for route in app.routes:
    if hasattr(route, "methods"):
        print(f"{route.path} {route.methods}")
    else:
        print(route.path)
