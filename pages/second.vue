<template>
    <div class="">
      <div class="wallet-container max-w-md mx-auto p-6 bg-gray-900 rounded-xl shadow-lg mt-24">
      <div v-if="!isConnected" class="text-center">
        <p class="text-gray-300 mb-4 text-lg">
          Connect your Solana wallet to continue
        </p>
        <button 
          @click="connectWallet" 
          class="connect-btn bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
        >
          Connect Wallet
        </button>
      </div>
      <div v-else class="wallet-info space-y-4">
        <p class="text-green-400 font-semibold text-lg">Wallet Connected</p>
        <p class="text-gray-300">
          Address:
          <span class="address bg-gray-800 px-2 py-1 rounded-md text-sm font-mono text-purple-300">
            {{ walletAddress?.slice(0, 4) }}...{{ walletAddress?.slice(-4) }}
          </span>
        </p>
        <p class="text-gray-300">
          Balance: 
          <span class="text-white font-medium">
            {{ balance !== null ? `${balance} SOL` : 'Loading...' }}
          </span>
        </p>
        <div class="flex space-x-2">
          <input 
            type="number" 
            v-model="amount" 
            placeholder="Amount in SOL"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
          <button 
            @click="sendMoney" 
            class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 flex items-center"
            
          >
            Send <svg v-if="pending" class="animate-spin h-4 w-4 text-white ml-2" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-dasharray="31.4 31.4"
                stroke-linecap="round"></circle>
            </svg>
          </button>
        </div>
        <button 
          @click="disconnectWallet" 
          class="disconnect-btn w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-300"
        >
          Disconnect
        </button>
      </div>
    </div>
    </div>
   
  </template>
  
  
  <script lang="ts" setup>
  import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
  import { AnchorProvider, Program, Wallet as AnchorWallet, BN } from '@coral-xyz/anchor';
  import {  PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
  import idl from '../idl/idl-first.json';
  import type { Pdacansend } from "../idl/send-type";
  
  interface myAnchorWallet extends AnchorWallet {
    publicKey: PublicKey;
    payer: Keypair; // If you still need this custom property
  }
  
  const walletAddress = ref<string | null>(null);
  const isConnected = ref(false);
  const balance = ref<number | null>(null);
  const walletAdapter = ref<PhantomWalletAdapter>(new PhantomWalletAdapter());
  const anchorWallet = ref<myAnchorWallet | null>(null);
  const provider = ref<AnchorProvider | null>(null);
  
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const programID = new PublicKey("GXMw4SyGViN1y8d5sSCXchUpefu5GJeqCUnRmiBJATNQ");
  const pdaKey = new PublicKey("FLoiCNi3yCcek2E8E8TekLi6QhT3dRJCsAked2XLc4Bp");
  const amount = ref();
  const pending = ref(false);
  
  const createAnchorWallet = (adapter: PhantomWalletAdapter): myAnchorWallet => {
    if (!adapter.publicKey) {
      throw new Error("Wallet public key not available");
    }
    return {
      signTransaction: adapter.signTransaction.bind(adapter),
      signAllTransactions: adapter.signAllTransactions.bind(adapter),
      publicKey: adapter.publicKey,
      payer: Keypair.generate(), // If you still need this
    };
  };
  const createProvider = () => {
    try {
      if (!anchorWallet.value) {
        throw new Error('Wallet not initialized');
      }
      provider.value = new AnchorProvider(connection, anchorWallet.value, { preflightCommitment: "confirmed" });
  
      return provider.value;
    } catch (error) {
      console.error(error);
    }
  };
  
  const connectWallet = async () => {
    try {
      await walletAdapter.value.connect();
      const publicKey = walletAdapter.value.publicKey;
      
      if (publicKey) {
        createProvider();
        walletAddress.value = publicKey.toString();
        isConnected.value = true;
        anchorWallet.value = createAnchorWallet(walletAdapter.value as PhantomWalletAdapter);
        const newPro = createProvider();
        if (newPro) {
  
          balance.value = await newPro?.connection.getBalance(publicKey) / LAMPORTS_PER_SOL
  
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  const disconnectWallet = async () => {
    try {
      await walletAdapter.value.disconnect();
      walletAddress.value = null;
      isConnected.value = false;
      balance.value = null;
      anchorWallet.value = null;
      provider.value = null;
    } catch (error) {
      console.error('Wallet disconnection error:', error);
    }
  };
  
  const executeProgramMethod = async () => {
    if (!provider.value) {
      throw new Error('Provider not initialized');
    }
    try {
      console.log('Program method executed');
    } catch (error) {
      console.error('Program execution error:', error);
    }
  };
  
  const checkConnection = async () => {
    if (window.solana?.isConnected) {
      await connectWallet();
    }
  };
  
  
  const sendMoney = async () => {
    try {
      pending.value = true;
      if (!provider.value) throw new Error("Provider not initialized");
     
      const program = new Program(idl as Pdacansend, provider.value);
  
      const [pda] = PublicKey.findProgramAddressSync([Buffer.from("hello_world"), pdaKey.toBuffer()],
      program.programId);
  
      console.log("pda address => ", pda.toBase58());
  
      const signature = await program.methods.solTransfer(new BN(amount.value*LAMPORTS_PER_SOL)).accounts({
        pdaAccount:pda ,
        pdaMain: pdaKey,
        recipient: provider.value.wallet.publicKey,
  
      }).rpc();
  
      console.log("signature =>",signature);
  
    } catch (error) {
      console.error(error);
    }
    finally{
      pending.value = false;
    }
  };
  
  
  onMounted(() => {
    checkConnection();
  });
  </script>