/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pdacansend.json`.
 */
export type Pdacansend = {
  
  "address": "GXMw4SyGViN1y8d5sSCXchUpefu5GJeqCUnRmiBJATNQ",
  "metadata": {
    "name": "pdacansend",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "solTransfer",
      "discriminator": [
        135,
        254,
        247,
        202,
        217,
        48,
        184,
        165
      ],
      "accounts": [
        {
          "name": "pdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  101,
                  108,
                  108,
                  111,
                  95,
                  119,
                  111,
                  114,
                  108,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "pdaMain"
              }
            ]
          }
        },
        {
          "name": "pdaMain",
          "writable": true
        },
        {
          "name": "recipient",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "customAccount",
      "discriminator": [
        99,
        151,
        198,
        27,
        164,
        9,
        6,
        138
      ]
    }
  ],
  "types": [
    {
      "name": "customAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bumpSeed",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
