# Prize Application Answers

## Protocol Labs - $20,000

### Why you're applicable for this prize:

We use IPFS via Pinata to store coffee production photos and metadata, and Hypercerts protocol to mint verifiable impact certificates. All farmer photos are stored on IPFS with GPS coordinates and timestamps, creating an immutable chain of custody. Hypercerts use IPFS for metadata storage, ensuring both raw data and certificates are permanently accessible and tamper-proof.

### Link to the line of code where the tech is used:

- `src/services/ipfsService.ts` - Lines 1-328 (IPFS uploads via Pinata SDK)
- `src/services/hypercertService.ts` - Lines 1-412 (Hypercerts SDK with IPFS metadata references)
- `src/services/photoService.ts` - Line 88 (uploading photos to IPFS)
- `src/pages/HypercertsPage.tsx` - Line 155 (minting hypercerts)

### How easy is it to use the API / Protocol? (1 - very difficult, 10 - very easy)

**9** - Pinata SDK provides a clean, chainable API that makes IPFS uploads straightforward. Hypercerts SDK integrates well with IPFS for metadata. Both are well-documented and easy to use.

### Additional feedback:

Excellent developer experience. The chainable API pattern is intuitive and gateway URLs are automatically generated. Minor improvement: better TypeScript types for upload responses.

---

## Aztec - $5,000

### Why you're applicable for this prize:

We use ZKPassport SDK for zero-knowledge proof of humanity verification, which may use Aztec's technology for ZK proof generation. Our app implements ZK proofs for privacy-preserving identity verification, allowing users to prove they are human (age >= 18) without revealing personal information.

### Link to the line of code where the tech is used:

- `src/services/zkPassportService.ts` - Lines 1-111 (ZKPassport SDK with `.gte("age", 18)` proof)
- `src/components/HumanityProof.tsx` - Line 120 (creating verification request)

### How easy is it to use the API / Protocol? (1 - very difficult, 10 - very easy)

**7** - ZKPassport SDK has a clean query builder API, but requires web/mobile app coordination. Error handling can be complex. Documentation is good but edge cases could be better explained.

### Additional feedback:

Query builder pattern is intuitive. Main challenge is mobile app integration and edge case handling. Better error messages would improve developer experience.

---

## Coinbase Developer Platform - $20,000

### Why you're applicable for this prize:

We use CDP as the core infrastructure for our entire application. CDP provides embedded wallets, authentication, and blockchain integration, allowing coffee farmers to interact with Web3 without understanding crypto. We use CDP for authentication, wallet management, transactions, and Hypercerts integration for minting coffee traceability certificates.

### Link to the line of code where the tech is used:

- `src/config.ts` - Lines 19-36 (CDP configuration)
- `src/main.tsx` - Line 35 (CDPReactProvider wrapper)
- `src/services/hypercertService.ts` - Lines 7, 37-64 (CDP embedded wallet integration)
- `src/pages/SignedInScreen.tsx` - Line 2 (CDP hooks: `useEvmAddress`, `useIsSignedIn`)
- `src/components/Header.tsx` - Line 1 (`AuthButton` component)
- `src/components/EOATransaction.tsx` - Lines 5-6 (CDP transaction components)

### How easy is it to use the API / Protocol? (1 - very difficult, 10 - very easy)

**9** - Pretty easy to use. React hooks are intuitive, `AuthButton` handles all auth complexity, and `createCDPEmbeddedWallet` makes wallet integration straightforward. Embedded wallets mean no browser extensions needed. Excellent TypeScript types and documentation.

### Additional feedback:

Best Web3 onboarding solution. Embedded wallets are a game-changer for onboarding non-crypto users. React hooks are well-designed. Integration with Viem via `toViemAccount` is seamless. Would appreciate more pre-built frontend components (e.g., wallet connection status, transaction history, account switcher) to speed up development. Supports both EOA and Smart Accounts out of the box.

