<template>
    <div>
        <div
            class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 p-4">
            <div
                class="bg-gray-800/80 backdrop-blur-md shadow-2xl p-8 rounded-2xl w-full max-w-md text-center border border-gray-700/50">
                <h1
                    class="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                    Send token to PDA and get SOL.
                </h1>

                <!-- Show Connect/Disconnect Button -->
                <button v-if="!pubKey" @click="isWalletModalOpen = true"
                    class="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-gray-100 px-6 py-2 rounded-lg transition shadow-md hover:scale-105">
                    Connect Wallet
                </button>
                <button v-else @click="disconnect()"
                    class="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-gray-100 px-6 py-2 rounded-lg transition shadow-md hover:scale-105">
                    Disconnect
                </button>

                <!-- Show Connected Wallet -->
                <div v-if="pubKey" class="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                    <p class="text-sm flex flex-wrap items-center justify-center gap-2">
                        <span class="text-blue-400 whitespace-nowrap">Wallet:</span>
                        <span class="font-mono bg-gray-800 px-2 py-1 rounded-md break-all max-w-full">{{ pubKey
                            }}</span>
                    </p>
                    <p class="text-sm mt-2 flex items-center justify-center gap-2">
                        <span class="text-green-400 whitespace-nowrap">Balance:</span>
                        <span class="font-mono bg-gray-800 px-2 py-1 rounded-md">{{ userbalance }} SOL</span>
                    </p>
                    <p class="text-sm mt-2 flex items-center justify-center gap-2">
                        <span class="text-green-400 whitespace-nowrap">Amount of token to send:</span>
                        <span class="font-mono bg-gray-800 px-2 py-1 rounded-md">30000 </span>
                    </p>
                    <!-- <p class="text-sm mt-2 flex items-center justify-center gap-2">
                        <span class="text-green-400 whitespace-nowrap">Token Balance:</span>
                        <span class="font-mono bg-gray-800 px-2 py-1 rounded-md">{{  0}} </span>
                    </p> -->
                </div>

                <!-- New Inputs for Receiver Public Key & Amount -->
                <!-- <div v-if="pubKey" class="mt-4">
                    <label class="text-gray-300 text-sm">Receiver's Public Key</label>
                    <input v-model="receiverPublicKey" type="text"
                        class="w-full mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-center placeholder-gray-500"
                        placeholder="Enter recipient public key" />

                    <label class="text-gray-300 text-sm mt-3 block">Amount to Transfer</label>
                    <input v-model="solAmount" type="number"
                        class="w-full mt-1 p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-center placeholder-gray-500"
                        placeholder="Enter amount in SOL" />
                </div> -->

                <!-- Send SOL Button -->
                <button v-if="pubKey" @click="trade()"
                    class="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-gray-100 px-6 py-2 rounded-lg transition shadow-md hover:scale-105 mt-4 mx-auto flex items-center">
                    Send SOL
                    <svg v-if="pending" class="animate-spin h-4 w-4 text-white ml-2" viewBox="0 0 24 24" fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
                            stroke-dasharray="31.4 31.4" stroke-linecap="round"></circle>
                    </svg>
                </button>

                <!-- Transaction Success Message -->
                <div v-if="toastMessage"
                    class="mt-6 p-4 text-gray-100 rounded-lg border shadow-lg max-w-full break-words text-center"
                    :class="{
                        'bg-red-600/80 border-red-500': toastType === 'error',
                        'bg-green-600/80 border-green-500': toastType !== 'error'
                    }">
                    <p class="font-semibold">{{ toastMessage }}</p>
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
                    <button
                        class="mt-6 bg-gray-600 hover:bg-gray-500 text-gray-100 px-4 py-2 rounded-lg w-full transition"
                        @click="isWalletModalOpen = false">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>


<script lang="ts" setup>
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
    window.Buffer = Buffer; // Only runs on the client
}
import type { Adapter, WalletAdapter } from "@solana/wallet-adapter-base";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    LedgerWalletAdapter,
    TrustWalletAdapter,

} from '@solana/wallet-adapter-wallets';
import { Wallet as AnchorWallet, AnchorProvider, Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { program } from "@coral-xyz/anchor/dist/cjs/native/system";
import idl from '~/idl/spltoken.json';
import type { Spltoken } from '~/idl/spltoken';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import nacl from "tweetnacl";

const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};


// Store available wallets
const availableWallets = ref<WalletAdapter[]>([]);
const selectedWallet = ref<WalletAdapter>();
const pending = ref(false);
const pubKey = ref();
const isWalletModalOpen = ref(false);
const solAmount = ref();
const receiverPublicKey = ref();
const session = ref();

const toastMessage = ref<undefined | string>('');
const toastType = ref<'success' | 'error'>('success');
interface myAnchorWallet extends AnchorWallet {
    publicKey: PublicKey;
    payer: Keypair; // If you still need this custom property
}
const provider = ref<AnchorProvider>();
const userbalance = ref(0);
const tokenBalance = ref();
const user_ata = ref();
const mint_address = new PublicKey("9k2d6uWKkrSXETEUFJvxA9RkdVwZ7UCp8rahwrRB4PUm");
// Resolve the correct path to the keypair file

const secretKey = [137, 190, 73, 40, 57, 242, 154, 151, 21, 226, 177, 18, 236, 62, 168, 206, 95, 221, 6, 195, 54, 241, 81, 147, 233, 148, 18, 104, 113, 86, 115, 169, 31, 177, 242, 71, 9, 43, 139, 109, 215, 36, 127, 106, 205, 190, 199, 171, 19, 15, 32, 28, 7, 68, 145, 197, 45, 74, 171, 184, 126, 37, 239, 28];




// Convert to Uint8Array and load the keypair
const user = Keypair.fromSecretKey(Uint8Array.from(secretKey));

// const network = props.network;
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
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
                    const deepLink = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(window.location.origin)}&dapp_encryption_public_key=${encodeURIComponent(bs58.encode(pubForConnection.publicKey))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/transfer-token")}&cluster=devnet`;
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
                    const deepLink = `https://solflare.com/ul/v1/connect?app_url=${encodeURIComponent(window.location.origin)}&dapp_encryption_public_key=${encodeURIComponent(bs58.encode(pubForConnection.publicKey))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/transfer-token")}&cluster=devnet`;
                    window.location.href = deepLink;


                    return;

                }
            }
        }
        selectedWallet.value = wallet;
        await selectedWallet.value.connect();
        pubKey.value = selectedWallet.value.publicKey?.toBase58();
        if (pubKey.value) {
            isWalletModalOpen.value = false;
            provider.value = new AnchorProvider(connection, createAnchorWallet(selectedWallet.value as PhantomWalletAdapter));
            userbalance.value = await provider.value.connection.getBalance(selectedWallet.value.publicKey!) / LAMPORTS_PER_SOL;
            user_ata.value = getAssociatedTokenAddressSync(mint_address, new PublicKey(pubKey.value));
            // const { value } = await provider.value.connection.getTokenAccountBalance(user_ata.value);
            // if(!value){
            //     tokenBalance.value = 0;
            //     return
            // }
            // tokenBalance.value = value;
        };






    } catch (error) {
        console.error('Wallet connection failed:', error);

    }

}
const disconnect = async () => {
    try {
        await selectedWallet.value?.disconnect();
        pubKey.value = null;
        toastMessage.value = undefined;
    } catch (error) {
        console.error('Wallet disconnect failed:', error);
    }
};

const trade = async () => {
    try {
        pending.value = true
        if (isMobile()) {

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
            if(!senderPublicKey){
                throw new Error("Public key missing");
                
            }

            // const recipientPublicKey = new PublicKey("DfgVxYwWWFMm5D9wEQy8FcuUKG9Edeb3JPuz3hsxcyWS");
            // Create the transaction first
            const senderAccount = getAssociatedTokenAddressSync(mint_address, senderPublicKey);
            if(!senderAccount){
                throw new Error("Sender account missing");
                
            }
            // const receiverTokenAccount = getAssociatedTokenAddressSync(mint_address, new PublicKey(receiverPublicKey.value));
            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: senderPublicKey, // Phantom wallet user will sign as feePayer
            });
            // solAmount.value = new BN(0.1 * LAMPORTS_PER_SOL);
            // const amount_token = new BN(30000).mul(new BN(10).pow(new BN(9)));
            const senderAta = getAssociatedTokenAddressSync(mint_address, senderPublicKey);
            if(!senderAta){
                throw new Error("Sender ata not found");
                
            }
            // const receiverTokenAccount = getAssociatedTokenAddressSync(mint_address, new PublicKey(receiverPublicKey.value));
            const [pda] = PublicKey.findProgramAddressSync([Buffer.from("hello_world5"), new PublicKey("38j1tZDtrjrs7P4HZ76Hbbb9s8BmdDHarmBpzDoFRofh").toBuffer()], new PublicKey("DBxiw94c7U99NsrMkvjnVsocbwsjRvAzW1D4yCA1yKS6"));
            console.log("pda => ", pda.toBase58());
            const ata = getAssociatedTokenAddressSync(mint_address, pda, true);
            if(!pda || !ata){
                throw new Error("Pda or ata missing");
                
            }
            console.log("pda ata => ", ata.toBase58());

            const instruction = await program.methods.transferAndGetSol(new BN(0.1 * LAMPORTS_PER_SOL), new BN(30000).mul(new BN(10).pow(new BN(9)))).accounts({
                mint: mint_address,
                pdaAta: ata,
                senderTokenAccount: senderAta,
                theKey: new PublicKey("38j1tZDtrjrs7P4HZ76Hbbb9s8BmdDHarmBpzDoFRofh"),
                sender: senderPublicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                pdaAccount: pda,  // ✅ Added
                // tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,  // ✅ Added
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,  // ✅ Added
            }).instruction();
            transaction.add(instruction);
            toastMessage.value = "Transaction prepared";
            const payload = {
                session: sessionToken,
                transaction: bs58.encode(transaction.serialize({ requireAllSignatures: false }))
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
            if (walletType === "phantom") {
                signURL = `https://phantom.app/ul/v1/signAndSendTransaction?dapp_encryption_public_key=${encodeURIComponent(bs58.encode(dappEncryptionPublicKey))}&nonce=${encodeURIComponent(bs58.encode(nonce))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/transfer-token")}&payload=${encodeURIComponent(bs58.encode(encryptedPayload))}`;
                toastMessage.value = "Redirecting to Phantom for signing...";
                window.location.href = signURL;
                return
            }
            if (walletType === "solflare") {
                signURL = `https://solflare.com/ul/v1/signAndSendTransaction?dapp_encryption_public_key=${encodeURIComponent(bs58.encode(dappEncryptionPublicKey))}&nonce=${encodeURIComponent(bs58.encode(nonce))}&redirect_link=${encodeURIComponent("https://wallet-transferr.netlify.app/transfer-token")}&payload=${encodeURIComponent(bs58.encode(encryptedPayload))}`;
                toastMessage.value = "Redirecting to Phantom for signing...";
                window.location.href = signURL;
                return
            }

            toastMessage.value = "No wallet selected";
        }
        const program = new Program(idl as Spltoken, provider.value);
        solAmount.value = new BN(0.1 * LAMPORTS_PER_SOL);
        const amount_token = new BN(30000).mul(new BN(10).pow(new BN(9)));
        const senderAta = getAssociatedTokenAddressSync(mint_address, provider.value?.wallet.publicKey!);
        // const receiverTokenAccount = getAssociatedTokenAddressSync(mint_address, new PublicKey(receiverPublicKey.value));
        const [pda] = PublicKey.findProgramAddressSync([Buffer.from("hello_world5"), new PublicKey("38j1tZDtrjrs7P4HZ76Hbbb9s8BmdDHarmBpzDoFRofh").toBuffer()], program.programId);
        console.log("pda => ", pda.toBase58());
        const ata = getAssociatedTokenAddressSync(mint_address, pda, true);
        console.log("pda ata => ", ata.toBase58());
        const signature = await program.methods.transferAndGetSol(new BN(0.1 * LAMPORTS_PER_SOL), new BN(30000).mul(new BN(10).pow(new BN(9)))).accounts({
            mint: mint_address,
            pdaAta: ata,
            senderTokenAccount: senderAta,
            theKey: new PublicKey("38j1tZDtrjrs7P4HZ76Hbbb9s8BmdDHarmBpzDoFRofh"),
            sender: provider.value?.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            pdaAccount: pda,  // ✅ Added
            // tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,  // ✅ Added
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,  // ✅ Added
        }).rpc();
        toastMessage.value = signature;
        toastType.value = "success"
        console.log("signature => ", signature);
    } catch (error:any) {
        
        toastMessage.value = error;
        console.error('Error while trading:', error);
        
    }
    finally {
        pending.value = false
    }
}
const handleRedirection = async () => {
    try {
        const walletType = localStorage.getItem("wallet");
        let phantomKey
        const urlParams = new URLSearchParams(window.location.search);
        if (walletType === "phantom") {
            phantomKey = urlParams.get("phantom_encryption_public_key");
        }

        if (walletType === "solflare") {
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
            userbalance.value = await connection.getBalance(new PublicKey(pubKey.value)) / LAMPORTS_PER_SOL;
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
    if (isMobile()) {
        if (typeof window !== "undefined") {
            window.Buffer = Buffer;
            detectWallets();

            // Add window event listener for wallet connections
            window.addEventListener('load', detectWallets);
            if (window.location.search) {
                handleRedirection()
            }
        }
    }

});
</script>

<style></style>