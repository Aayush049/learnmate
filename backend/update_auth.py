import re

with open('app/api/v1/endpoints/auth.py', 'r') as f:
    content = f.read()

new_imports = """
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
"""

if "google.oauth2" not in content:
    content = content.replace("from typing import Any", "from typing import Any\n" + new_imports)

google_login_func = """
@router.post("/google", response_model=schemas.TokenResponse)
def google_login(
    req: schemas.user.GoogleLoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    \"\"\"
    Login or register using Google OAuth credential.
    \"\"\"
    try:
        # Verify the token
        # If GOOGLE_CLIENT_ID is set, we can pass audience=settings.GOOGLE_CLIENT_ID
        id_info = id_token.verify_oauth2_token(
            req.credential, 
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        email = id_info.get("email")
        name = id_info.get("name", "")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
            
        # Check if user exists
        user_model = auth.get_user_model()
        user = db.query(user_model).filter(user_model.email == email).first()
        
        if not user:
            # Register new user
            # Create a random password for OAuth users since they don't use it
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            random_password = ''.join(secrets.choice(alphabet) for i in range(16))
            
            user = user_model(
                email=email,
                full_name=name,
                hashed_password=auth.get_password_hash(random_password),
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        elif not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
            
        # Generate token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            subject=user.email, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
"""

if "@router.post(\"/google\"" not in content:
    content += "\n" + google_login_func

with open('app/api/v1/endpoints/auth.py', 'w') as f:
    f.write(content)
