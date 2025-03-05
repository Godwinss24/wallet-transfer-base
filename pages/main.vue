<template>
  <div>
    <SendFunds network="devnet" :receiver="receiver" :sol-amount="0.002" :url="url"/>
  </div>
</template>

<script lang="ts" setup>
const receiver = "DfgVxYwWWFMm5D9wEQy8FcuUKG9Edeb3JPuz3hsxcyWS"
const url = "http://localhost:3000"

</script>

<style>

</style>