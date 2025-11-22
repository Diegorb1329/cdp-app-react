import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";

/**
 * The Sign In screen
 */
function SignInScreen() {
  return (
    <main className="signin-screen">
      <div className="signin-content">
        <h1 className="signin-title">Welcome to Coffee Traceability</h1>
        <p className="signin-subtitle">Sign in to start documenting your coffee production journey</p>
        <div className="signin-button-container">
          <AuthButton />
        </div>
      </div>
    </main>
  );
}

export default SignInScreen;

