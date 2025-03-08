// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  devServer: {
    port: 4000
  },
  runtimeConfig: {
      privateKey:[137,190,73,40,57,242,154,151,21,226,177,18,236,62,168,206,95,221,6,195,54,241,81,147,233,148,18,104,113,86,115,169,31,177,242,71,9,43,139,109,215,36,127,106,205,190,199,171,19,15,32,28,7,68,145,197,45,74,171,184,126,37,239,28]
  }
})