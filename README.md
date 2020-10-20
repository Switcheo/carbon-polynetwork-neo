# Switcheo TradeHub Neo Deposit Contract

This is the repository contains the Neo deposit contracts for Switcheo TradeHub.

## Deployment

1. Compile the contract at `Nep5ProxyPip1.cs` using [neocompiler](https://neocompiler.io/#!/ecolab/network)
2. Note the address and script hash (big endian)
3. Download the avm as hex file
4. Pull the deploy script [here](https://github.com/Switcheo/switcheo-scripts/blob/master/deploy_neo_contract.js )
5. Run: `npm install`
6. Copy the avm file to the script root.
7. Run: `node ./deploy_neo_contract.js "Switcheo Nep5ProxyPip1" "1.0.0" "Switcheo TradeHub LockProxy Test" "07" "1000" "1" "./<filename>.avm" "<private key>"`
8. After successful deploy, update deployed contract addresses below and copy avm file to `./avm`

## Current deployed contracts

### Devnet Legacy LockProxy

- Address: AKr5QcNkWBRCp7MvoLaSjduyYygJtwygDC
- Big Endian ScriptHash: 0x9d6403718883f02f57af6e9e69dfd3adf4fbab2c
- Little Endian ScriptHash: 2cabfbf4add3df699e6eaf572ff083887103649d

### Devnet Permissionless LockProxy

- Address: AJjGh9yY1MpbtBvD8rDDLKpyT3bizT3XA3
- Big Endian ScriptHash: 0xbbb779eebba4bb48d712a0664d5c9513fd5d6a20
- Little Endian ScriptHash: 206a5dfd13955c4d66a012d748bba4bbee79b7bb

### Devnet SWTH Token

- Address: ATK41UFV9sFGxoZNH9Uvvzsv9JT62zULtS
- Big Endian ScriptHash: 0x040dd0556fcd21a5ac36c383952dca1b88ed8e7e
- Little Endian ScriptHash: 7e8eed881bca2d9583c336aca521cd6f55d00d04

### Devnet SWTH-N Token

- Address: AWRkndPJZmgX3KqY9dJTCL4h9LAqhDpeUQ
- Big Endian ScriptHash: 0x0547d2f308e1c8a0eb9994febe4c6d5a5ad7bba0
- Little Endian ScriptHash: a0bbd75a5a6d4cbefe9499eba0c8e108f3d24705

### Mainnet Legacy LockProxy

- Address: AHwoWtUgwruKoGZ8hLrEHr1erESfd2Lf9Z
- Big Endian ScriptHash: 0xcd19745dbf1305f206978ddcfdcb7fca6ef6d017
- Little Endian ScriptHash: 17d0f66eca7fcbfddc8d9706f20513bf5d7419cd

### Mainnet Permissionless LockProxy

- Address: AJedCGpz28puGEA75nUNZUCEechim7SHua
- Big Endian ScriptHash: 0x164d669f0543441fba277b87cdc80c76cd66891f
- Little Endian ScriptHash: 1f8966cd760cc8cd877b27ba1f4443059f664d16

### MainNet SWTH-N Token

- Address: AM2bRtiLMa9FoD5txrSp9DQhukAtQVjQaQ
- Big Endian ScriptHash: 0x3e09e602eeeb401a2fec8e8ea137d59aae54a139
- Little Endian ScriptHash: 39a154ae9ad537a18e8eec2f1a40ebee02e6093e

### Utils

- [Address Converter](https://neocompiler.io/#!/ecolab/conversor)
