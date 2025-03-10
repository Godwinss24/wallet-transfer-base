<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { Buffer } from "buffer";
import type { Adapter, WalletAdapter } from "@solana/wallet-adapter-base";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
// import { Wallet as AnchorWallet, AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import {Wallet as AnchorWallet, AnchorProvider, Program, BN} from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from '~/idl/spltoken.json';
import type { Spltoken } from '~/idl/spltoken';

// Add mobile-specific wallet detection
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Existing refs
const availableWallets = ref<WalletAdapter[]>([]);
const selectedWallet = ref<WalletAdapter>();
const pending = ref(false);
const pubKey = ref<string | undefined>();
const isWalletModalOpen = ref(false);
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const toastMessage = ref();
const toastType = ref();
const solAmount = ref();

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
// Enhanced wallet connection with mobile support
const connectWallet = async (wallet: WalletAdapter) => {
    try {
        selectedWallet.value = wallet;
        
        // Mobile-specific handling
        if (isMobile()) {
            // For Phantom mobile
            if (wallet instanceof PhantomWalletAdapter) {
                const phantomWindow = window as any;
                if (phantomWindow.solana?.isPhantom) {
                    await wallet.connect();
                } else {
                    // Redirect to Phantom deep link
                    const deepLink = `phantom://connect?app_url=${encodeURIComponent(window.location.origin)}`;
                    window.location.href = deepLink;
                    return;
                }
            }
            // Add similar checks for other mobile wallets
            if (wallet instanceof SolflareWalletAdapter) {
                const solflareWindow = window as any;
                if (!solflareWindow.solflare?.isSolflare) {
                    const deepLink = `solflare://connect?app_url=${encodeURIComponent(window.location.origin)}`;
                    window.location.href = deepLink;
                    return;
                }
            }
        }

        // Normal connection flow
        await wallet.connect();
        pubKey.value = wallet.publicKey?.toBase58();

        if (pubKey.value) {
            isWalletModalOpen.value = false;
            const provider = new AnchorProvider(
                connection,
                createAnchorWallet(wallet as PhantomWalletAdapter)
            );
            // Rest of your connection logic...
        }
    } catch (error) {
        console.error('Wallet connection failed:', error);
        throw error;
    }
};

// Enhanced wallet detection
const detectWallets = async () => {
    const wallets: WalletAdapter[] = [];
    const phantom = new PhantomWalletAdapter();
    const solflare = new SolflareWalletAdapter();
    
    const solWindow = window as any;
    
    // Wait for wallets to load (some take a moment to inject)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for Phantom
    if (solWindow.solana?.isPhantom) {
        console.log("Phantom detected!");
        wallets.push(phantom);
    }
    
    // Check for Solflare
    if (solWindow.solflare?.isSolflare) {
        console.log("Solflare detected!");
        wallets.push(solflare);
    }
    
    // Fallback: Add wallets even if not detected, for manual connection
    if (wallets.length === 0) {
        console.log("No wallets detected in browser. Adding defaults for manual connection.");
        wallets.push(phantom, solflare);
    }
    
    // Event listeners for dynamic updates
    phantom.on('connect', () => console.log("Phantom connected!"));
    phantom.on('disconnect', () => console.log("Phantom disconnected!"));
    
    availableWallets.value = wallets;
};

const handleWalletConnect = async (publicKey: PublicKey) => {
    pubKey.value = publicKey.toBase58();
    // Add your connection logic here
};

const handleWalletDisconnect = () => {
    pubKey.value = undefined;
    selectedWallet.value = undefined;
};

// Rest of your existing code...

onMounted(() => {
    if (typeof window !== "undefined") {
        window.Buffer = Buffer;
        detectWallets();
        
        // Add window event listener for wallet connections
        window.addEventListener('load', detectWallets);
    }
});

// Cleanup
onUnmounted(() => {
    availableWallets.value.forEach(wallet => {
        wallet.off('connect', handleWalletConnect);
        wallet.off('disconnect', handleWalletDisconnect);
    });
    window.removeEventListener('load', detectWallets);
});
</script>

<template>
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <!-- Wallet Connection Status -->
      <div class="w-full max-w-md mb-6">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-bold mb-4 text-gray-800" v-if="pubKey">
            {{ pubKey ? 'Connected Wallet' : 'Wallet Not Connected' }}
          </h2>
          
          <div v-if="pubKey" class="space-y-4">
            <p class="text-sm text-gray-600 break-all">
              {{ pubKey }}
            </p>
            <!-- <p class="text-sm text-gray-600">
              SOL Balance: {{ userbalance.value }} SOL
            </p> -->
            <button 
              class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-200"
            >
              Disconnect
            </button>
          </div>
          
          <button 
            v-else
            @click="isWalletModalOpen = true"
            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-200"
          >
            Connect Wallet
          </button>
        </div>
      </div>
  
      <!-- Transaction Section (Visible when connected) -->
      <div v-if="pubKey" class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-bold mb-4 text-gray-800">Trade</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Amount (SOL)
              </label>
              <input
                v-model="solAmount"
                type="number"
                step="0.1"
                class="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SOL amount"
              />
            </div>
            <button
              @click=""
              :disabled="pending"
              class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition duration-200 disabled:opacity-50"
            >
              {{ pending ? 'Processing...' : 'Execute Trade' }}
            </button>
          </div>
        </div>
      </div>
  
      <!-- Wallet Selection Modal -->
      <div 
        v-if="isWalletModalOpen" 
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg w-full max-w-sm mx-4 p-6 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Select Wallet</h3>
            <button 
              @click="isWalletModalOpen = false"
              class="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div class="space-y-3">
            <button 
              v-for="wallet in availableWallets"
              :key="wallet.name"
              @click="connectWallet(wallet)"
              class="w-full flex items-center space-x-3 p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
            >
              <img 
                :src="wallet.icon" 
                alt="wallet icon" 
                class="w-6 h-6"
              />
              <span class="text-gray-800 font-medium">
                {{ wallet.name }}
              </span>
            </button>
            
            <p v-if="availableWallets.length === 0" class="text-gray-600 text-center">
              No wallets detected
            </p>
          </div>
        </div>
      </div>
  
      <!-- Toast Notification -->
      <div 
        v-if="toastMessage"
        :class="[
          'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md text-white',
          toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
        ]"
      >
        {{ toastMessage }}
      </div>
    </div>
  </template>