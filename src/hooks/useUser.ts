import { useState, useEffect } from 'react';
import { useEvmAddress, useIsSignedIn } from '@coinbase/cdp-hooks';
import { getUserByWallet } from '../services/userService';
import type { User } from '../lib/supabase';

/**
 * Custom hook to get the current user's data from Supabase
 * Returns the user object and loading state
 */
export function useUser() {
  const { evmAddress } = useEvmAddress();
  const { isSignedIn } = useIsSignedIn();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (!isSignedIn || !evmAddress) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userData = await getUserByWallet(evmAddress);
      setUser(userData);
      setLoading(false);
    }

    fetchUser();
  }, [isSignedIn, evmAddress]);

  return { user, loading };
}

