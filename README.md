# Switcheo <> Polychain LockProxy for Neo

## Deployment

1. Compile the contract at `Nep5ProxyPip1.cs` using [neocompiler](https://neocompiler.io/#!/ecolab/network)
2. Note the address and script hash (big endian)
3. Download the avm as hex file
4. Pull the deploy script [here](https://github.com/Switcheo/switcheo-scripts/blob/master/deploy_neo_contract.js )
5. Run: `npm install`
6. Copy the avm file to the script root.
7. Run: `node ./deploy_neo_contract.js "Switcheo Nep5ProxyPip1" "1.0.0" "Switcheo TradeHub LockProxy Test" "01" "1000" "1" "./<filename>.avm" "<private key>"`
8. After successful deploy, update deployed contract addresses below and copy avm file to `./avm`

## Current deployed contracts

### Devnet

- Address: AGcPYW5PpnhdT4SnkHpxLT7L1JHKsuTMMK
- Big Endian ScriptHash: 0xe339df1177666d17308a06dc9386e8d82fec2c09
- Little Endian ScriptHash: 092cec2fd8e88693dc068a30176d667711df39e3

### Mainnet

- Address: AHwoWtUgwruKoGZ8hLrEHr1erESfd2Lf9Z
- Big Endian ScriptHash: 0xcd19745dbf1305f206978ddcfdcb7fca6ef6d017
- Little Endian ScriptHash: 17d0f66eca7fcbfddc8d9706f20513bf5d7419cd

### Utils

- [Address Converter](https://neocompiler.io/#!/ecolab/conversor)
