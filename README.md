# SendFunds Component

## Overview
The `SendFunds` component allows users to send SOL tokens on the Solana blockchain. It connects to a supported Solana wallet, initiates a transaction, and returns a transaction signature upon success.

## Features
- Supports multiple Solana wallets (Phantom, Solflare, Trust Wallet, etc.).
- Sends SOL tokens to a specified recipient.
- Works on different Solana networks (devnet, testnet, mainnet-beta).
- Emits events for transaction confirmation and failure.

## Installation
Ensure you have the required dependencies installed in your project:

```sh
npm install @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-wallets @coral-xyz/anchor
```

## Dependencies
The component utilizes the following Solana libraries:

```ts
import type { Adapter, WalletAdapter } from "@solana/wallet-adapter-base";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    LedgerWalletAdapter,
    TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Wallet as AnchorWallet, AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, Cluster } from "@solana/web3.js";
```

## Props
The component accepts the following props:

| Prop Name   | Type    | Description |
|------------|--------|-------------|
| `receiver` | string | The recipient's Solana wallet address (PublicKey). |
| `solAmount` | number | Amount of SOL to send. |
| `network`  | Cluster | The Solana network (`devnet`, `testnet`, `mainnet-beta`). |
| `url`      | string  | The RPC endpoint for connecting to the blockchain. |

## Events
The component emits events for transaction status updates:

| Event Name               | Payload | Description |
|--------------------------|---------|-------------|
| `transaction-confirmed`  | string  | Transaction signature upon successful transaction. |
| `transaction-failed`     | string  | Error message if the transaction fails. |

## Usage Example
```vue
<template>
    <SendFunds
        network="devnet"
        :receiver="receiver"
        :sol-amount="0.002"
        :url="url"
        @transaction-confirmed="handleSuccess"
        @transaction-failed="handleError"
    />
</template>

<script setup>
const receiver = "recipient_wallet_address";
const url = "https://api.devnet.solana.com";

const handleSuccess = (signature) => {
    console.log("Transaction successful! Signature:", signature);
};

const handleError = (error) => {
    console.error("Transaction failed:", error);
};
</script>
```

## How It Works (Step-by-Step)
1. **Wallet Selection**: The user selects a supported wallet (Phantom, Solflare, etc.).
2. **Transaction Initialization**: The component prepares a transaction to send SOL to the `receiver`.
3. **Network Connection**: It connects to the specified Solana network using the provided `url`.
4. **Transaction Signing**: The wallet signs the transaction.
5. **Transaction Submission**: The signed transaction is submitted to the Solana blockchain.
6. **Confirmation & Events**:
   - If successful, the `transaction-confirmed` event is emitted with the transaction signature.
   - If it fails, the `transaction-failed` event is emitted with an error message.

## Transaction Verification
Once the transaction is complete, the user can verify it on Solana explorers like:

- **Devnet:** [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
- **Mainnet:** [https://explorer.solana.com/](https://explorer.solana.com/)

Simply enter the transaction signature in the explorer to track its status.

## Notes
- Ensure the sender's wallet has enough SOL to cover both the transfer and transaction fees.
- The component only works if the user has a Solana-compatible wallet installed.

## Conclusion
This component provides an easy way to send SOL tokens while handling wallet interactions and transaction confirmations efficiently. 🚀

