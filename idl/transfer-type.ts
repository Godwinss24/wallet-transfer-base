/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/soltransferservice.json`.
 */
export type Soltransferservice = {
    "address": "2fBnWwqsLMkVy3xn6drifmixVtLtHJVTitbyY7Btp2cm",
    "metadata": {
      "name": "soltransferservice",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
      {
        "name": "sendsolana",
        "discriminator": [
          2,
          223,
          49,
          157,
          187,
          112,
          31,
          40
        ],
        "accounts": [
          {
            "name": "sender",
            "writable": true,
            "signer": true
          },
          {
            "name": "receipient",
            "writable": true
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
    ]
  };
  