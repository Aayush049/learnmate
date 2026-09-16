with open('../frontend/src/pages/public/RegisterPage.tsx', 'r') as f:
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
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google signup failed or was cancelled.");
  };
"""

if "handleGoogleSuccess" not in content:
    content = content.replace("const handleSubmit = async", google_login_func + "\n  const handleSubmit = async")

if "const { register } = useAuth();" in content:
    content = content.replace("const { register } = useAuth();", "const { register, googleLogin } = useAuth();")

google_button = """
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
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

if "Or sign up with" not in content:
    content = content.replace("</Button>", "</Button>\n" + google_button)

with open('../frontend/src/pages/public/RegisterPage.tsx', 'w') as f:
    f.write(content)

