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
import { Wallet as AnchorWallet, AnchorProvider, Program, BN, Wallet } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from '~/idl/spltoken.json';
import type { Spltoken } from '~/idl/spltoken';
import nacl from "tweetnacl";
import bs58 from "bs58";

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
const sharedSecret = ref<Uint8Array>();
const session = ref();
const fakeWallet = ref<Wallet>();
const toastData = ref();
const toastSession = ref();
const pubforConnection2 = ref();


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
          const pubForConnection = nacl.box.keyPair();
          localStorage.setItem("wallet", "phantom");
          // pubforConnection2.value = pubForConnection.publicKey.toString();
          // Store keys in localStorage (use Base58 for correct encoding)
          localStorage.setItem("publicKey", bs58.encode(pubForConnection.publicKey));
          localStorage.setItem("pubKeyForConnection", bs58.encode(pubForConnection.publicKey));
          localStorage.setItem("privateKey", bs58.encode(pubForConnection.secretKey));

          // Generate the Phantom deep link (encode the public key properly)
          const deepLink = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(window.location.origin)}&dapp_encryption_public_key=${encodeURIComponent(bs58.encode(pubForConnection.publicKey))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/sol")}&cluster=devnet`;
          window.location.href = deepLink;


          return;
        }
      }
      // Add similar checks for other mobile wallets
      if (wallet instanceof SolflareWalletAdapter) {
        const solflareWindow = window as any;
        if (!solflareWindow.solflare?.isSolflare) {
            const pubForConnection = nacl.box.keyPair();
          localStorage.setItem("wallet", "solflare");
          // pubforConnection2.value = pubForConnection.publicKey.toString();
          // Store keys in localStorage (use Base58 for correct encoding)
          localStorage.setItem("publicKey", bs58.encode(pubForConnection.publicKey));
          localStorage.setItem("pubKeyForConnection", bs58.encode(pubForConnection.publicKey));
          localStorage.setItem("privateKey", bs58.encode(pubForConnection.secretKey));

          // Generate the Phantom deep link (encode the public key properly)
          const deepLink = `https://solflare.com/ul/v1/connect?app_url=${encodeURIComponent(window.location.origin)}&dapp_encryption_public_key=${encodeURIComponent(bs58.encode(pubForConnection.publicKey))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/sol")}&cluster=devnet`;
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
    toastMessage.value = `From connect wallet => ${error} `
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


const decryptPayLoad = (data: string, nonce: string, sharedSecret?: Uint8Array) => {
  try {
    if (!sharedSecret) {
      toastMessage.value = "share secret missing"
      throw new Error("Missing shared secret");

    }
    const decryptedData = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret)
    if (!decryptedData) {
      toastMessage.value = "could not decrypt data"
      throw new Error("Unable to decrypt data");
    }
    const testingData = JSON.parse(Buffer.from(decryptedData).toString("utf8"));
    // toastSession.value = ` ${testingData.session}`;
    // toastData.value = `public key => ${testingData.public_key}`;
    return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
  } catch (error) {
    toastMessage.value = `Error while decrypting ${error}`
  }
}



const handleRedirection = () => {
  try {
    const walletType = localStorage.getItem("wallet");
    let phantomKey
    const urlParams = new URLSearchParams(window.location.search);
    if(walletType === "phantom"){
        phantomKey = urlParams.get("phantom_encryption_public_key");
    }
    
    if(walletType === "solflare"){
        phantomKey = urlParams.get("solflare_encryption_public_key");
    }
    
    const nonce = urlParams.get("nonce");
    const data = urlParams.get("data");
    if (urlParams.has("errorCode")) {
      const errorCode = urlParams.get("errorCode");
      const errorMessage = urlParams.get("errorMessage");
      toastMessage.value = `Transaction rejected: ${errorCode} - ${errorMessage}`;
      console.error(`Error: ${errorCode} - ${errorMessage}`);
      return;
    }

    if (!nonce || !data) {
      throw new Error("Missing nonce or data in the URL parameters.");
    }

    const dappSecretBase58 = localStorage.getItem("privateKey");
    if (!dappSecretBase58) {
      throw new Error("Dapp private key is missing from local storage.");
    }

    const dappSecret = bs58.decode(dappSecretBase58);
    let sharedSecretDapp: Uint8Array | null = null;

    if (phantomKey) {
      // This is the connection flow
      sharedSecretDapp = nacl.box.before(bs58.decode(phantomKey), dappSecret);
      if (!sharedSecretDapp) {
        throw new Error("Failed to generate shared secret.");
      }

      localStorage.setItem("sharedSecret", bs58.encode(sharedSecretDapp));
    } else {
      // This is the transaction flow
      const storedSharedSecret = localStorage.getItem("sharedSecret");
      if (!storedSharedSecret) {
        throw new Error("Shared secret missing from local storage.");
      }
      sharedSecretDapp = bs58.decode(storedSharedSecret);
    }

    // Attempt to decrypt the payload
    const connectData = decryptPayLoad(data, nonce, sharedSecretDapp);

    if (!connectData) {
      throw new Error("Decryption failed, connectData is null.");
    }
    localStorage.setItem("session", connectData.session);
    // toastData.value = localStorage.getItem("session");


    // If this is the connection flow, store public key and session
    if (phantomKey) {
      pubKey.value = connectData.public_key;
      session.value = connectData.session;
      localStorage.setItem("pubKey", connectData.public_key);
    } else {
      // Transaction flow: Validate transaction signature
      if (!connectData.signature) {
        throw new Error("Invalid transaction signature.");
      }
      toastMessage.value = `Transaction signature: ${connectData.signature}`;
    }
  } catch (error) {
    toastMessage.value = `Error in handleRedirection: ${error}`;
  }
};


const encryptPayload = (payload: any, sharedSecret?: Uint8Array) => {
  if (!sharedSecret) throw new Error("missing shared secret");

  const nonce = nacl.randomBytes(24);
  localStorage.setItem("nonce", bs58.encode(nonce));

  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );
  if (!encryptPayload) {
    toastMessage.value = `From encrypt function`
  }
  return [nonce, encryptedPayload];
}

const sendsol = async () => {
  try {
    pending.value = true;

    const sessionToken = localStorage.getItem("session");
    if (!sessionToken) {
      toastMessage.value = "Session not found in localStorage";
      throw new Error("Session is missing");
    }
    // toastSession.value = `Using session: ${sessionToken.slice(0, 10)}...`;

    const connection = new Connection(clusterApiUrl("devnet"));
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    // toastData.value = `Blockhash: ${blockhash.slice(0, 10)}...`;

    // Use a provider without a wallet for an unsigned transaction
    const provider = new AnchorProvider(connection, {} as any, { preflightCommitment: "confirmed" });
    const program = new Program(idl as Spltoken, provider);
    
    const senderPublicKey = new PublicKey(localStorage.getItem("pubKey")!);

    const recipientPublicKey = new PublicKey("DfgVxYwWWFMm5D9wEQy8FcuUKG9Edeb3JPuz3hsxcyWS");
    // Create the transaction first
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderPublicKey, // Phantom wallet user will sign as feePayer
    });
    const instruction = await program.methods.sendsolana(new BN(solAmount.value * LAMPORTS_PER_SOL)).accounts({
      sender: senderPublicKey,
      receipient: recipientPublicKey
    }).instruction();
    transaction.add(instruction);
    toastMessage.value = "Transaction prepared";
    const payload = {
      session: sessionToken,
      transaction: bs58.encode(transaction.serialize({requireAllSignatures: false}))
    };

    const storedSharedSecret = localStorage.getItem("sharedSecret");
    if (!storedSharedSecret) {
      toastMessage.value = "Shared secret missing";
      throw new Error("Shared secret is undefined");
    }

    const sharedSecretDapp = bs58.decode(storedSharedSecret);
    const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecretDapp);

    const dappEncryptionPublicKey = bs58.decode(localStorage.getItem("publicKey")!);
    const walletType = localStorage.getItem("wallet");
    let signURL;
    if(walletType === "phantom"){
        signURL = `https://phantom.app/ul/v1/signAndSendTransaction?dapp_encryption_public_key=${encodeURIComponent(bs58.encode(dappEncryptionPublicKey))}&nonce=${encodeURIComponent(bs58.encode(nonce))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/sol")}&payload=${encodeURIComponent(bs58.encode(encryptedPayload))}`;
        toastMessage.value = "Redirecting to Phantom for signing...";
        window.location.href = signURL;
        return
    }
    if(walletType === "solflare"){
        signURL = `https://solflare.com/ul/v1/signAndSendTransaction?dapp_encryption_public_key=${encodeURIComponent(bs58.encode(dappEncryptionPublicKey))}&nonce=${encodeURIComponent(bs58.encode(nonce))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/sol")}&payload=${encodeURIComponent(bs58.encode(encryptedPayload))}`;
        toastMessage.value = "Redirecting to Phantom for signing...";
        window.location.href = signURL;
        return
    }

    toastMessage.value = "No wallet selected";


  } catch (error) {
    toastMessage.value = `Error in sendSol: ${error}`;
  } finally {
    pending.value = false;
  }
};





onMounted(() => {
  if (typeof window !== "undefined") {
    window.Buffer = Buffer;
    detectWallets();

    // Add window event listener for wallet connections
    window.addEventListener('load', detectWallets);
    if (window.location.search) {
      handleRedirection()
    }
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
  <!-- <p>pubkey for connection {{ pubforConnection2 }}</p> -->
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
            class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-200">
            Disconnect
          </button>
        </div>

        <button v-else @click="isWalletModalOpen = true"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-200">
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
            <input v-model="solAmount" type="number" step="0.1"
              class="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter SOL amount" />
          </div>
          <button @click="sendsol()" :disabled="pending"
            class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition duration-200 disabled:opacity-50">
            {{ pending ? 'Processing...' : 'Execute Trade' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Wallet Selection Modal -->
    <div v-if="isWalletModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-full max-w-sm mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-800">Select Wallet</h3>
          <button @click="isWalletModalOpen = false" class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div class="space-y-3">
          <button v-for="wallet in availableWallets" :key="wallet.name" @click="connectWallet(wallet)"
            class="w-full flex items-center space-x-3 p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200">
            <img :src="wallet.icon" alt="wallet icon" class="w-6 h-6" />
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
    <div v-if="toastMessage" :class="[
    'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md text-white',
    'max-w-md w-auto', // Added to control width
    toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
  ]">
    <p class="break-words overflow-hidden">{{ toastMessage }}</p>
</div>
<div v-if="toastData" :class="[
    'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md text-white',
    'max-w-md w-auto', // Added to control width
    toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
  ]">
    <p class="break-words overflow-hidden">Data => {{ toastData }}</p>
</div>
<div v-if="toastSession" :class="[
    'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md text-white',
    'max-w-md w-auto', // Added to control width
    toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
  ]">
    <p class="break-words overflow-hidden">session => {{ toastSession }}</p>
</div>

  </div>
</template>