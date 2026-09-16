with open('../frontend/src/api/auth.ts', 'r') as f:
    content = f.read()

google_login_func = """
  // Google Login
  async googleLogin(credential: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google', { credential });
    
    // Store token and user data
    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
"""

if "googleLogin(" not in content:
    content = content.replace("  // Logout", google_login_func + "\n  // Logout")

with open('../frontend/src/api/auth.ts', 'w') as f:
    f.write(content)
