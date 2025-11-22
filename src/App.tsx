import { useIsInitialized, useIsSignedIn, useEvmAddress } from "@coinbase/cdp-hooks";
import { useEffect } from "react";

import Loading from "./components/Loading";
import SignedInScreen from "./pages/SignedInScreen";
import SignInScreen from "./pages/SignInScreen";
import { syncUser } from "./services/userService";

/**
 * This component how to use the useIsIntialized, useEvmAddress, and useIsSignedIn hooks.
 * It also demonstrates how to use the AuthButton component to sign in and out of the app.
 */
function App() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();

  // Sync user to Supabase when they sign in
  useEffect(() => {
    if (isSignedIn && evmAddress) {
      syncUser(evmAddress).then((user) => {
        if (user) {
          console.log('User synced to database:', user);
        } else {
          console.error('Failed to sync user to database');
        }
      });
    }
  }, [isSignedIn, evmAddress]);

  return (
    <div className="app flex-col-container flex-grow">
      {!isInitialized && <Loading />}
      {isInitialized && (
        <>
          {!isSignedIn && <SignInScreen />}
          {isSignedIn && <SignedInScreen />}
        </>
      )}
    </div>
  );
}

export default App;
