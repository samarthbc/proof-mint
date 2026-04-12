# Proof Mint Frontend

Tailwind + shadcn-style React frontend for claiming image ownership on the `ProofOfOwnership` contract.

## Features

- Wallet connect/login with MetaMask.
- Polygon Amoy chain enforcement and one-click network switch.
- Image upload flow that hashes image content and calls `registerContent(hash, ipfsCID)`.
- Explorer link for submitted transaction.

## Environment setup

Create `.env` in project root:

```bash
REACT_APP_PROOF_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

## Scripts

- `npm start`
- `npm run build`
- `npm test`
