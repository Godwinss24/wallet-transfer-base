<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 text-gray-200">
    <div class="max-w-2xl w-full p-6 bg-gray-800 shadow-lg rounded-lg">
     
      <NuxtLink to="/main">
        <div class="mt-6">
        <h3 class="text-lg font-semibold text-green-300">Send Funds ATM</h3>
        <p class="text-gray-400 mt-1">This will get funds from the user and transfer it to another account</p>
      </div>
      </NuxtLink>
      <NuxtLink to="/second">
      <div class="mt-6">
        <h3 class="text-lg font-semibold text-green-300">Send money to PDA and get some back</h3>
        <p class="text-gray-400 mt-1">Send at least 1 SOL and you'll get 0.1</p>
      </div>
    </NuxtLink>
    <NuxtLink to="/token">
      <div class="mt-6">
        <h3 class="text-lg font-semibold text-green-300">Buy SPL token</h3>
        <p class="text-gray-400 mt-1">
          Send SOL and get back some SPL tokens. Note: If you open your wallet and can't find the token, check your wallet explorer.
        </p>
      </div>
    </NuxtLink>

    <NuxtLink to="/send-token">
      <div class="mt-6">
        <h3 class="text-lg font-semibold text-green-300">Send SPL token to a user</h3>
        <p class="text-gray-400 mt-1">
          Make sure the sender has the token. The receiver's token account will be initialized automatically by the smart contract.
        </p>
      </div>
      </NuxtLink>
    <NuxtLink to="/transfer-token">
      <div class="mt-6">
        <h3 class="text-lg font-semibold text-green-300">Send SPL token to PDA and get SOL</h3>
        <p class="text-gray-400 mt-1">
          Make sure the sender has the token.
        </p>
      </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script lang="ts" setup>
const receiver = "DfgVxYwWWFMm5D9wEQy8FcuUKG9Edeb3JPuz3hsxcyWS";
</script>

<style>
/* Additional custom styles if needed */
</style>
