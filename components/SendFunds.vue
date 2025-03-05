<template>

    <div
        class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 p-4">
        <div
            class="bg-gray-800/80 backdrop-blur-md shadow-2xl p-8 rounded-2xl w-full max-w-md text-center border border-gray-700/50">
            <h1
                class="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                Solana Wallet Connector
            </h1>

            <!-- Show Connect/Disconnect Button -->
            <button v-if="!pubKey" @click="isWalletModalOpen = true"
                class="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-gray-100 px-6 py-2 rounded-lg transition shadow-md hover:scale-105">
                Connect Wallet
            </button>
            <button v-else @click="disconnectWallet()"
                class="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-gray-100 px-6 py-2 rounded-lg transition shadow-md hover:scale-105">
                Disconnect
            </button>

            <!-- Show Connected Wallet -->
            <div v-if="pubKey" class="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                <p class="text-sm flex flex-wrap items-center justify-center gap-2">
                    <span class="text-blue-400 whitespace-nowrap">Wallet:</span>
                    <span class="font-mono bg-gray-800 px-2 py-1 rounded-md break-all max-w-full">{{ pubKey }}</span>
                </p>
                <p class="text-sm mt-2 flex items-center justify-center gap-2">
                    <span class="text-green-400 whitespace-nowrap">Balance:</span>
                    <span class="font-mono bg-gray-800 px-2 py-1 rounded-md">{{ userbalance }} SOL</span>
                </p>
            </div>

            <!-- Input for SOL Amount -->
            <div v-if="pubKey" class="mt-4">
                <p class="text-gray-100">{{ props.solAmount }} SOL</p>
            </div>

            <button v-if="pubKey" @click="sendsolana()"
                class="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-gray-100 px-6 py-2 rounded-lg transition shadow-md hover:scale-105 mt-4 mx-auto flex  items-center">
                Send SOL <svg v-if="pending" class="animate-spin h-4 w-4 text-white ml-2" viewBox="0 0 24 24"
                    fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-dasharray="31.4 31.4"
                        stroke-linecap="round"></circle>
                </svg>
            </button>
            <!-- Transaction Success Message -->
            <div v-if="toastMessage" class="mt-6 p-4 text-gray-100 rounded-lg border shadow-lg" :class="{
                'bg-red-600/80 border-red-500': toastType === 'error',
                'bg-green-600/80 border-green-500': toastType !== 'error'
            }">
                <p class="text-center font-semibold">{{ toastMessage }}</p>
            </div>

        </div>

        <!-- Modal for Wallet Selection -->
        <div v-if="isWalletModalOpen"
            class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center transition-opacity duration-300">
            <div
                class="bg-gray-800/90 backdrop-blur-lg p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-105">
                <h2 class="text-xl font-semibold mb-6 text-gray-100">Select a Wallet</h2>
                <ul>
                    <li v-for="wallet in availableWallets" :key="wallet.name"
                        class="cursor-pointer p-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-blue-600 hover:to-blue-500 rounded-md text-center transition mb-3 text-gray-100"
                        @click="connectwallet(wallet)">
                        {{ wallet.name }}
                    </li>
                </ul>
                <button class="mt-6 bg-gray-600 hover:bg-gray-500 text-gray-100 px-4 py-2 rounded-lg w-full transition"
                    @click="isWalletModalOpen = false">
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  window.Buffer = Buffer; // Only runs on the client
}

// Props for the component
const props = defineProps<{
    receiver: string; // PublicKey of the recipient wallet
    solAmount: number; // Amount of SOL to send
    network: Cluster;
    // url: string;
}>();

// Define emits for transaction status
const emit = defineEmits<{
    (e: "transaction-confirmed", signature: string): void;
    (e: "transaction-failed", error: string): void;
}>();

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

const toastMessage = ref<undefined | string>('');
const toastType = ref<'success' | 'error'>('success');
// Store available wallets
const availableWallets = ref<WalletAdapter[]>([]);
const selectedWallet = ref<WalletAdapter>();
const pending = ref(false);
const pubKey = ref();
const isWalletModalOpen = ref(false);
// const solAmount = ref();
const userbalance = ref(0);
const provider = ref<AnchorProvider>();
const network = props.network;
const connection = new Connection(clusterApiUrl(network), "confirmed");
import type { Soltransferservice } from "idl/transfer-type";
import myidl from "../idl/idl.json";
const transactionStatus = ref<"idle" | "success" | "error">("idle");
const transactionSignature = ref<string | null>(null); // Store the signature

const receipient = new PublicKey(props.receiver);


// interface myAnchorWallet extends AnchorWallet {
//   publicKey: PublicKey;
//   payer: Keypair; // If you still need this custom property
// }

// Define a stricter type for adapters that support Anchor's requirements
interface AnchorCompatibleWalletAdapter extends WalletAdapter {
    signTransaction(tx: Transaction): Promise<Transaction>;
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
}

const createAnchorWallet = (adapter: PhantomWalletAdapter): AnchorWallet => {
    try {
        if (!adapter.publicKey) {
            throw new Error("Wallet public key not available");
        }
        return {
            signTransaction: adapter.signTransaction.bind(adapter),
            signAllTransactions: adapter.signAllTransactions.bind(adapter),
            publicKey: adapter.publicKey,
            payer: Keypair.generate(), // If you still need this
        };
    } catch (error) {
        console.error("an unexpected error => ", error);
        // Re-throw the error to ensure the function doesn't return undefined
        throw error instanceof Error ? error : new Error("Unknown error occurred while creating Anchor wallet");

    }
};




const connectwallet = async (wallet: WalletAdapter) => {
    try {
        selectedWallet.value = wallet;
        await selectedWallet.value.connect();
        pubKey.value = selectedWallet.value.publicKey?.toBase58();
        if (pubKey.value) {
            isWalletModalOpen.value = false;
            provider.value = new AnchorProvider(connection, createAnchorWallet(selectedWallet.value as PhantomWalletAdapter));
            userbalance.value = await provider.value.connection.getBalance(selectedWallet.value.publicKey!) / LAMPORTS_PER_SOL;
        };





    } catch (error) {
        console.error('Wallet connection failed:', error);

    }

}





// Disconnect Wallet
const disconnectWallet = async () => {
    try {
        await selectedWallet.value?.disconnect();
        pubKey.value = null;
        toastMessage.value = undefined;
    } catch (error) {
        console.error('Wallet disconnect failed:', error);
    }
};

const sendsolana = async () => {
    try {
        if (selectedWallet.value === undefined) {
            throw new Error("Wallet not connected");

        }
        await selectedWallet.value.connect();
        pending.value = true;
        const program = new Program(myidl as Soltransferservice, provider.value);

        // Get the latest blockhash for confirmation
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

        const signature = await program.methods.sendsolana(new BN(props.solAmount * LAMPORTS_PER_SOL)).accounts({
            sender: provider.value?.wallet.publicKey,
            receipient: receipient
        })
            .rpc();
        console.log("signature => ", signature);
        // Confirm the transaction
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, "confirmed");

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }
        // Transaction confirmed successfully
        transactionStatus.value = "success";
        transactionSignature.value = signature;
        emit("transaction-confirmed", signature);
        toastMessage.value = 'Transaction successful!';
        toastType.value = 'success';
        // performPostConfirmationAction();
    } catch (error) {
        console.error("error => ", error);
        toastMessage.value = 'Transaction failed!';
        toastType.value = 'error';
        transactionStatus.value = "error";
        transactionSignature.value = null;
        emit("transaction-failed", error instanceof Error ? error.message : "An unknown error occurred");
        throw error;
    }
    finally {
        pending.value = false;
    }
}

// const performPostConfirmationAction = () => {
//     window.location.href = props.url;
// }

// Detect installed wallets on mount
onMounted(() => {
    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new TorusWalletAdapter(),
        new LedgerWalletAdapter(),
        // new TrustWalletAdapter()
    ].filter(wallet => wallet.readyState === 'Installed'); // Only show installed wallets

    availableWallets.value = wallets;
});
</script>

<style></style>
