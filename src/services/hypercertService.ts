import { HypercertClient, formatHypercertData, TransferRestrictions } from "@hypercerts-org/sdk";
import { createWalletClient, custom, http } from "viem";
import { sepolia, base } from "viem/chains";
import type { ProcessBatch, Farm } from '../lib/supabase';
import { getBatchPhotos, isBatchReadyForHypercert } from './farmProcessService';
import { supabase } from '../lib/supabase';
import { createCDPEmbeddedWallet, toViemAccount, getCurrentUser } from '@coinbase/cdp-core';

// Get chain ID from environment or default to Sepolia
const getChainId = (): number => {
  const chainId = import.meta.env.VITE_HYPERCERT_CHAIN_ID;
  if (chainId) return parseInt(chainId);
  return 11155111; // Sepolia testnet default
};

// Get chain config
const getChain = () => {
  const chainId = getChainId();
  if (chainId === 84532) return base; // Base Sepolia
  return sepolia; // Default to Sepolia
};

/**
 * Initialize Hypercert client with wallet
 * Based on Hypercerts SDK documentation: https://www.hypercerts.org/docs/developer/quickstart-javascript
 * Uses CDP (Coinbase Developer Platform) embedded wallets via toViemAccount
 */
export async function createHypercertClient(): Promise<HypercertClient | null> {
  try {
    const chain = getChain();
    const chainId = getChainId();
    
    // Try to get wallet client from CDP embedded wallet first
    let walletClient;
    
    try {
      // Get current user from CDP to get the account
      const user = await getCurrentUser();
      
      if (!user || !user.evmAccounts || user.evmAccounts.length === 0) {
        throw new Error('No EVM account found. Please ensure you are signed in with Coinbase Wallet.');
      }
      
      // Get the first EVM account and convert it to a Viem account
      const evmAccount = user.evmAccounts[0];
      const viemAccount = toViemAccount(evmAccount);
      
      // Create CDP embedded wallet provider (EIP-1193 compatible)
      // This provides a provider that can sign and send transactions
      const wallet = createCDPEmbeddedWallet({
        chains: [chain],
        transports: {
          [chain.id]: http(),
        } as any, // Type assertion needed for dynamic chain ID
      });
      
      // Get the EIP-1193 provider from the wallet
      const provider = wallet.provider;
      
      // Request account access (required for CDP embedded wallets)
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please ensure you are signed in with Coinbase Wallet.');
      }
      
      // Check current chain and switch if necessary
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        const currentChainIdNumber = parseInt(currentChainId as string, 16);
        
        if (currentChainIdNumber !== chainId) {
          console.log(`Wallet is on chain ${currentChainIdNumber}, switching to ${chainId} (${chain.name})`);
          
          // Try to switch chain
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
            console.log('Successfully switched to target chain');
          } catch (switchError: any) {
            // If chain doesn't exist, try to add it
            if (switchError.code === 4902 || switchError.message?.includes('does not exist')) {
              console.log('Chain not found in wallet, attempting to add it...');
              
              const chainParams = {
                chainId: `0x${chainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: {
                  name: chain.nativeCurrency.name,
                  symbol: chain.nativeCurrency.symbol,
                  decimals: chain.nativeCurrency.decimals,
                },
                rpcUrls: [chain.rpcUrls.default.http[0]],
                blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : [],
              };
              
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [chainParams],
              });
              
              console.log('Successfully added and switched to target chain');
            } else {
              throw switchError;
            }
          }
        }
      } catch (chainError) {
        console.warn('Could not check or switch chain:', chainError);
        // Continue anyway - the transaction might still work
      }
      
      // Create wallet client with both the account and the provider
      // The account is needed for the SDK to know which account to use
      walletClient = createWalletClient({
        account: viemAccount,
        chain,
        transport: custom(provider),
      });
      
      console.log('Created wallet client from CDP embedded wallet with account:', viemAccount.address);
    } catch (cdpError) {
      console.warn('Failed to get CDP wallet, trying fallback:', cdpError);
      
      // Fallback: Try window.ethereum (for browser extensions like MetaMask or Coinbase Wallet extension)
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereumProvider = (window as any).ethereum;
        walletClient = createWalletClient({
          chain,
          transport: custom(ethereumProvider),
        });
        console.log('Created wallet client from window.ethereum');
      } else {
        throw new Error('Ethereum provider not found. Please ensure you are signed in with Coinbase Wallet or have a wallet extension installed.');
      }
    }

    if (!walletClient) {
      throw new Error('Failed to create wallet client. Please ensure you are signed in with Coinbase Wallet.');
    }

    // Create HypercertClient with proper configuration
    // According to Hypercerts SDK documentation, the client needs 'environment' parameter
    // Environment can be 'test' or 'production'
    // For Sepolia testnet, we use 'test', for mainnet use 'production'
    const environment = chainId === 1 || chainId === 8453 ? 'production' : 'test';
    
    console.log('Creating HypercertClient with:', { 
      environment, 
      chainId, 
      hasWalletClient: !!walletClient 
    });
    
    // The SDK requires 'environment' parameter, and optionally walletClient and publicClient
    const client = new HypercertClient({
      environment,
      walletClient,
    });
    
    console.log('HypercertClient created successfully');
    return client;

  } catch (error) {
    console.error('Error creating Hypercert client:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Get contributor wallet address from farm
 */
async function getContributorAddress(farm: Farm): Promise<string> {
  try {
    // Get user by farmer_id (assuming farmer_id is the user id)
    const { data: userData, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', farm.farmer_id)
      .single();

    if (error || !userData) {
      // Fallback: try to use farmer_id as wallet address if it's already an address
      if (farm.farmer_id.startsWith('0x')) {
        return farm.farmer_id.toLowerCase();
      }
      throw new Error('Could not find contributor wallet address');
    }

    return userData.wallet_address.toLowerCase();
  } catch (error) {
    console.error('Error getting contributor address:', error);
    // Fallback: use farmer_id if it looks like an address
    if (farm.farmer_id.startsWith('0x')) {
      return farm.farmer_id.toLowerCase();
    }
    throw error;
  }
}

/**
 * Format batch data for Hypercert metadata automatically from farm data
 * All metadata is generated automatically:
 * - Dates: first and last photo dates
 * - Work scope: "Specialty coffee, Data, Trazability"
 * - Impact scope: "All"
 * - Contributors: farmer wallet address
 */
export async function formatBatchForHypercert(
  batch: ProcessBatch,
  farm: Farm
): Promise<{ data: any; valid: boolean; errors: any }> {
  try {
    // Get all photos from the batch
    const photos = await getBatchPhotos(farm.id, batch.batch_id);
    
    if (photos.length === 0) {
      return {
        data: null,
        valid: false,
        errors: { message: 'Batch must have at least one photo' }
      };
    }

    // Get first and last photo dates
    const photoDates = photos
      .map(p => new Date(p.taken_at).getTime())
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b);
    
    const firstPhotoDate = photoDates[0];
    const lastPhotoDate = photoDates[photoDates.length - 1];
    
    // Convert to UTC timestamps
    const workStartTimestamp = Math.floor(firstPhotoDate / 1000);
    const workEndTimestamp = Math.floor(lastPhotoDate / 1000);
    
    // Get contributor wallet address
    const contributorAddress = await getContributorAddress(farm);
    
    // Validate contributor address
    if (!contributorAddress || typeof contributorAddress !== 'string' || !contributorAddress.startsWith('0x')) {
      throw new Error('Invalid contributor address. Please ensure the farm has a valid farmer wallet address.');
    }
    
    // Validate timestamps
    if (!workStartTimestamp || !workEndTimestamp || isNaN(workStartTimestamp) || isNaN(workEndTimestamp)) {
      throw new Error('Invalid photo dates. Please ensure the batch has valid photos with dates.');
    }
    
    // Get batch number from batch_id (first 8 chars)
    const batchNumber = batch.batch_id.slice(0, 8);
    
    // Prepare metadata according to Hypercerts SDK formatHypercertData function signature
    // The function expects flat parameters, not nested objects
    const workScope = ["Specialty coffee", "Data", "Trazability"];
    const impactScope = ["All"];
    const contributors = [contributorAddress];
    const rights = ["Public Display"];
    const excludedWorkScope: string[] = [];
    const excludedImpactScope: string[] = [];
    const excludedRights: string[] = [];
    
    // Validate all arrays are defined and non-empty
    if (!workScope || !impactScope || !contributors || !rights || 
        workScope.length === 0 || impactScope.length === 0 || 
        contributors.length === 0 || rights.length === 0) {
      throw new Error('Failed to prepare metadata values. All fields must be defined and non-empty.');
    }
    
    // formatHypercertData expects flat parameters, not nested structure
    const metadataInput = {
      name: `${farm.name} - Batch ${batchNumber}`,
      description: `Specialty coffee production batch from ${farm.name}. This hypercert represents the complete production cycle including monthly updates, drying, and final bagging processes with full traceability and data verification.`,
      image: "ipfs://QmYOUR_IMAGE_CID", // TODO: Upload a default image or generate one
      external_url: `${window.location.origin}/app/farms/${farm.id}`,
      version: "1.0",
      workScope,
      excludedWorkScope,
      impactScope,
      excludedImpactScope,
      workTimeframeStart: workStartTimestamp,
      workTimeframeEnd: workEndTimestamp,
      impactTimeframeStart: workStartTimestamp,
      impactTimeframeEnd: 0, // 0 means indefinite
      contributors,
      rights,
      excludedRights,
    };
    
    console.log('Formatting hypercert metadata with input:', JSON.stringify(metadataInput, null, 2));
    
    // Format hypercert data with automatic values
    // formatHypercertData expects flat parameters according to SDK signature
    let metadata;
    try {
      metadata = formatHypercertData(metadataInput);
    } catch (formatError) {
      console.error('Error in formatHypercertData:', formatError);
      console.error('Input that caused error:', JSON.stringify(metadataInput, null, 2));
      throw new Error(`Failed to format hypercert data: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`);
    }

    return metadata;
  } catch (error) {
    console.error('Error formatting batch for hypercert:', error);
    return {
      data: null,
      valid: false,
      errors: { message: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Mint a hypercert for a completed batch
 * All metadata is automatically generated from farm and batch data
 */
export async function mintBatchHypercert(
  batch: ProcessBatch,
  farm: Farm,
  totalUnits: bigint = 10000n
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  try {
    // Check if batch is ready
    const readiness = await isBatchReadyForHypercert(farm.id, batch.batch_id);
    
    if (!readiness.ready) {
      return { success: false, error: readiness.reason || 'Batch is not ready for minting' };
    }

    // Create client
    const client = await createHypercertClient();
    if (!client) {
      return { success: false, error: 'Failed to create Hypercert client. Please ensure your wallet is connected and on the correct network.' };
    }

    // Format metadata automatically from farm and batch data
    const metadata = await formatBatchForHypercert(batch, farm);
    if (!metadata.valid) {
      console.error('Metadata validation failed:', metadata.errors);
      return { 
        success: false, 
        error: `Invalid metadata: ${JSON.stringify(metadata.errors, null, 2)}` 
      };
    }

    // Mint the hypercert
    // According to the SDK documentation, mintClaim returns a transaction receipt
    console.log('Minting hypercert...');
    console.log('Metadata:', JSON.stringify(metadata.data, null, 2));
    console.log('Total units:', totalUnits.toString());
    console.log('Transfer restrictions:', TransferRestrictions.FromCreatorOnly);
    
    try {
      const tx = await client.mintClaim(
        metadata.data,
        totalUnits,
        TransferRestrictions.FromCreatorOnly
      );

      console.log('Mint transaction result:', tx);

      // The mintClaim method returns a transaction receipt or hash
      // Extract the transaction hash as the claimId reference
      // The actual claim ID will be available in the transaction events
      const claimId = typeof tx === 'string' 
        ? tx 
        : (tx as any)?.hash || (tx as any)?.transactionHash || (tx as any)?.blockHash || 'pending';

      return { success: true, claimId };
    } catch (mintError) {
      console.error('Error during mintClaim:', mintError);
      const errorMessage = mintError instanceof Error 
        ? mintError.message 
        : 'Unknown error during minting';
      
      // Provide more helpful error messages
      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        return { success: false, error: 'Transaction was rejected by user' };
      }
      if (errorMessage.includes('insufficient balance') || errorMessage.includes('insufficient funds') || errorMessage.includes('gas')) {
        return { 
          success: false, 
          error: 'Insufficient balance. You need Sepolia ETH to pay for gas fees. Get some from a Sepolia faucet: https://sepoliafaucet.com/ or https://www.alchemy.com/faucets/ethereum-sepolia' 
        };
      }
      if (errorMessage.includes('chain') && errorMessage.includes('does not match')) {
        return { 
          success: false, 
          error: 'Network mismatch. Your wallet is connected to a different network. Please switch to Sepolia testnet in your wallet and try again.' 
        };
      }
      if (errorMessage.includes('network') || errorMessage.includes('chain')) {
        return { success: false, error: 'Network error. Please ensure you are connected to the correct network (Sepolia testnet).' };
      }
      
      return { success: false, error: `Minting failed: ${errorMessage}` };
    }
  } catch (error) {
    console.error('Error minting hypercert:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

