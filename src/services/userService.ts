import { supabase, type User } from '../lib/supabase';

/**
 * Sync user to Supabase database
 * Creates a new user if they don't exist, or returns existing user
 */
export async function syncUser(walletAddress: string): Promise<User | null> {
  try {
    // Normalize wallet address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();

    // First, check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error fetching user:', fetchError);
      return null;
    }

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return existingUser;
    }

    // User doesn't exist, create new one
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        wallet_address: normalizedAddress,
        zk_verified: false,
        role: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return null;
    }

    console.log('New user created:', newUser);
    return newUser;
  } catch (error) {
    console.error('Error syncing user:', error);
    return null;
  }
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Update user role
 */
export async function updateUserRole(
  walletAddress: string,
  role: 'farmer' | 'tester'
): Promise<User | null> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('wallet_address', normalizedAddress)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating role:', error);
    return null;
  }
}

/**
 * Update ZK verification status and unique identifier
 */
export async function updateZKVerification(
  walletAddress: string,
  verified: boolean,
  uniqueIdentifier: string | null,
  proofHash?: string | null
): Promise<User | null> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    console.log('updateZKVerification called with:', {
      walletAddress: normalizedAddress,
      verified,
      uniqueIdentifier,
      proofHash,
    });

    // First, check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (fetchError) {
      console.error('Error fetching user before update:', fetchError);
      // User might not exist, try to create or just return null
      return null;
    }

    if (!existingUser) {
      console.error('User not found in database');
      return null;
    }

    console.log('User found, current data:', existingUser);

    const updateData: {
      zk_verified: boolean;
      unique_identifier: string | null;
      zk_proof_hash?: string | null;
    } = {
      zk_verified: verified,
      unique_identifier: uniqueIdentifier,
    };

    if (proofHash !== undefined) {
      updateData.zk_proof_hash = proofHash;
    }

    console.log('Updating database with:', updateData);

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('wallet_address', normalizedAddress)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating ZK verification:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return null;
    }

    if (!data) {
      console.error('Update returned no data');
      return null;
    }

    console.log('Database update successful:', data);
    return data;
  } catch (error) {
    console.error('Exception updating ZK verification:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

