with open('../frontend/src/pages/public/LoginPage.tsx', 'r') as f:
    content = f.read()

imports = """
import { GoogleLogin } from '@react-oauth/google';
"""

if "@react-oauth/google" not in content:
    content = content.replace("import { useAuth } from '../../contexts/AuthContext';", "import { useAuth } from '../../contexts/AuthContext';\n" + imports)

google_login_func = """
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (!credentialResponse.credential) throw new Error("No credential received from Google");
      setIsLoading(true);
      setError(null);
      const loggedInUser = await googleLogin(credentialResponse.credential);
      const fallbackRoute = loggedInUser.is_admin ? '/admin/dashboard' : '/dashboard';
      const from = (location.state as any)?.from?.pathname || fallbackRoute;
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Login failed or was cancelled.");
  };
"""

if "handleGoogleSuccess" not in content:
    content = content.replace("const handleSubmit = async", google_login_func + "\n  const handleSubmit = async")

content = content.replace("const { login } = useAuth();", "const { login, googleLogin } = useAuth();")

google_button = """
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
              />
            </div>
"""

if "Or continue with" not in content:
    content = content.replace("</Button>", "</Button>\n" + google_button)

with open('../frontend/src/pages/public/LoginPage.tsx', 'w') as f:
    f.write(content)

