with open('../frontend/src/contexts/AuthContext.tsx', 'r') as f:
    content = f.read()

types_replacement = """
  login: (credentials: LoginCredentials) => Promise<User>;
  googleLogin: (credential: string) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
"""

if "googleLogin: (credential: string)" not in content:
    content = content.replace(
        "  login: (credentials: LoginCredentials) => Promise<User>;\n  register: (data: RegisterData) => Promise<void>;",
        types_replacement
    )

func_replacement = """
  const googleLogin = async (credential: string): Promise<User> => {
    try {
      const response = await authAPI.googleLogin(credential);
      setUser(response.user);
      return response.user;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Google Login failed.';
      throw new Error(errorMessage);
    }
  };

  const register =
"""

if "const googleLogin = async" not in content:
    content = content.replace("  const register =", func_replacement)

if "    login,\n    googleLogin,\n    register," not in content:
    content = content.replace("    login,\n    register,", "    login,\n    googleLogin,\n    register,")

with open('../frontend/src/contexts/AuthContext.tsx', 'w') as f:
    f.write(content)

