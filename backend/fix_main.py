with open('main.py', 'r') as f:
    content = f.read()

if 'Base.metadata.create_all' not in content:
    import_text = """from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.config import settings
from app.database import engine
from app.models import *  # ensure all models are loaded
from app.database import Base

# Create tables
Base.metadata.create_all(bind=engine)
"""
    content = content.replace('from fastapi.middleware.cors import CORSMiddleware\nfrom app.api.v1 import api_router\nfrom app.config import settings', import_text)
    
    with open('main.py', 'w') as f:
        f.write(content)
