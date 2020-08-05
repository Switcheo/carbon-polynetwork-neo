const { default: Neon, tx, wallet, rpc, u, nep5, api, CONST } = require("@cityofzion/neon-js");
const BigNumber = require('bignumber.js');

const protocol = require('./protocol.json')
const proxyavm = require('./nep5proxypip1.json')
const tokenavm = require('./swthtoken.json')

// neo devnet ccmc: de3ba846755178778c38a149d0fe0812d540c127
// https://github.com/polynetwork/docs/blob/master/config/README_DevNet.md

// input txns:
// b7715f82306a2d241aa9f841600eff82ba7f932cd8f22575cf86ebf0d2f7139c
// 6706e864fc71ba2ac29a0925b0c5eeedc76df2fd4546cd2e2fcad7193bd9171f
// 36fbe9733f61a239c188ccc94f0718838afb32caff29ac4a66952ba787f27630
// 6ef15743241f785cfcb1a2e7b8b1aab7704dbad0d79fd26366be3a9280b5e40c
// dce6244b1f093e63249ca6a634f4135ab6999cb49ec6f2099f4c70d6f70bc04d
// 5e170cec508b34aa00ced3f3e899ed3444fe2692a0eb9bd91d7c3684d69d0bdc
// d825dea475f2d80e53c4c6d121d9135a49dbac4150850641a2c960dbffa6d16f
// fefa66d14b55dad4fe18c8f7ef545278a0adb0dee22eaa5e4f561315fb0818d5
// 284b9f224c13b012d0b830ef6ce1c7f6632a45797dd4dc011d51580051515eba
// 61e8e29e4794429a80558ca70781687d23f99bdc02aeb99613cc99e4e92cc0ad
// 63d0f30f978607f1ca8f08d2c05196d17e786f3849d27b6c7ff8ef96d2f653cc
// 9a4a940e42a5491f425ecad78dd5ea9380c4d8a281996d7552b0fe04075567bc
// f96c5dc3e5c7774875d0e6d78f90b7eabc6ef8582ebdac0a989f9ef4b084195d

// deploy txns:
// swth v1: ca8da41a697cd5bc646b2bfc67d6c10e4d3a2620f9cc996b2d1cedecc1c9fdc0
// swth v2: 5c0a483cc2a331ec9eb280b819d5584beb95f7a163fd667f344bacc1e1c8fbd3
// swth v2.1: b72e737ca2cfe273ca67dd8cbab38fcb1abea37f9ca76e0a529087da5832102b
// swth v2.2: 51d9d5b41f305c3443e38a303c63d81990434cf83f9bf2fa4c8e7d5b5b675b0c
//
// lockproxy v2: d41836a79732c3077a175aabe4dc28ae823eedc51ed7f01f7887c65bb29c477d
// lockproxy v2.3: 02698d307b3fe306023f35114d87bbbeb1544fce7dd83226d5628e598e29cba1
// lockproxy v2.4: 640cd035950dccf12bda53b41838447024477d432ef0e25bce13d491f418d88a
// lockproxy v2.5: 168972920fbf22190f6e01f112e90dfcc1fc83ed1df52cb4bf9d0b10b3a3c031
// lockproxy v2.6: 81cd6805250cd1cdfdd40a9c73327cd2b81cdd3c2b9b9d4d645526a4887e1569

// contract script hashes:
// lockproxy v1: 8a7297e50d0d952e67f798719ed31b4528cc6ae3
// lockproxy v2: 0e2d9fd9f03f00dbdf85fa34e760ca4333d46312
// swth v1: a37f9d94d45138e435f6dfe0bb5a04422b1e7f0e
// swth v2: c9937a56c882087a204f0ab33a25fd7a5290ed27 => 27ed90527afd253ab30a4f207a0882c8567a93c9
// swth v6: 6992d8ba60540c7c5b464533543098a1bc04c040 => 40c004bca19830543345465b7c0c5460bad89269
// lockproxy v2.1: fa992729c38778afbf8dba51c5bc546611aba08a => 8aa0ab116654bcc551ba8dbfaf7887c3292799fa
// lockproxy v2.2: 97b13d8f09d8ee8e3203359e6204156004de3499 => 9934de04601504629e3503328eeed8098f3db197
// lockproxy v2.3: 1414b81e37a1b4248e0e5134155c71dd2e6a8cd9 => d98c6a2edd715c1534510e8e24b4a1371eb81414
// lockproxy v2.4: 534f3f32a61b81b88b97b796d62c83aab0d8728e => 8e72d8b0aa832cd696b7978bb8811ba6323f4f53 => AUm5BQgmA4Kzx6gAJryCp38xcDuYh9X961
// lockproxy v2.5: 5faf564a13601fc39b7e1a3bbc862c450538fa89 => 89fa3805452c86bc3b1a7e9bc31f60134a56af5f => AUMRyHfpzgWphxnptXwjbDBrkFcy6hQUeb
// lockproxy v2.6: 533fb0db7993b9f9d3acba4b798948ab2c354b0d => 0d4b352cab4889794bbaacd3f9b99379dbb03f53 => AGzAXWroWqR4nNzK8ULbLyWRsePCAqocDS

// invocation txns:
// swth_v2.deploy: 8fd47f792f7a0cd0ba511b221071ce21b2022d857eec0bd6eead8e3fe01492ce

// relayer txns:
// register asset: f7b340660e018ee840036ae2022ae5d98196e30005203e8ccc85326e8fee8671 => success
// unknown txn: 845055931d770f7d15c6b056e67b1709893486884ad9541280f0333d8f670269 => success
// register asset: fae354613e6f3005801c1a517e9f59e2ee91df6c69bd2b74fc10f25df245ac60 => success
//    RegisterAssetEvent(
//      nativeAssetHash, 27ed90527afd253ab30a4f207a0882c8567a93c9
//      fromChainId, 178
//      fromProxyContract, db8afcccebc026c6cae1d541b25f80a83b065c8a
//      assetHash 7377746833
//    )
//
// register asset: 7e75ce74d4ea439570b97f0ca5a1841a5886ed1377e662967a97f8f129b0d812 => success
//
// lock: cd0d4c165e707e059563a9ca587f2c93e571c70488429bc96a523bde1c00c5ac => error: "This asset has not yet been registered"
// lock: b8b7985cd013a960a84d991f2a5639ec4f84bfbd1ba9be6b180eb1ca1f53fb56 => error: "This asset has not yet been registered"
// lock: 2f55f08fca5aaca29dc4846fe2bff3c4339d29e262fdcdff6b20c6a3932df27d => success
// lock: 1da7cf5e23844f3d23476cb636a239283d2aa1c71f71acb3821a6c8fda7becce => error
// lock: d9535e2e740177333c50b053f7e8bda56d1a7682b20d6bf82cfdb36c64976b90 => error
// lock: ab272d221dd99c3eb6b0746d944ff47ca7f8b4b3356d35f67efa3914ef47c4d5
// lock: b3bf4c8e0b8ac0dd4f7bfb82f99f7f052fff11d4ba8301a40b45c6fbda2d3580

const net = 'NeoDevNet'
const url = 'http://47.89.240.111:12332'

function addNetwork() {
  const network = new rpc.Network({
    name: net,
    protocol: protocol.ProtocolConfiguration
  })

  Neon.add.network(network)
}

async function getBlock() {
  const res = await rpc.Query.getBlock(1).execute(url)
  console.log('res', res.result)
}

async function getUnspents(address) {
  const res = await rpc.Query.getUnspents(address).execute(url)
  console.log('res', res.result)
}

async function deploy({ name, script, account }) {
  // storage: {
  //   none: 0x00,
  //   storage: 0x01,
  //   dynamic: 0x02,
  //   storage+dynamic:0x03
  // }
  // if the third bit is set => payable
  const params = {
    script: script.trim(),
    name,
    version: '1.0',
    author: 'John',
    email: 'john.wong@switcheo.network',
    description: '',
    needsStorage: '07',
    parameterList: '0710',
    returnType: '05',
  }
  const sb = Neon.create.deployScript(params)
  const apiProvider = new api.neoCli.instance(url)

  const res = await Neon.doInvoke({
    api: apiProvider, // Network
    url: url, // RPC URL
    account: account, // Your Account
    script: sb.str, // The Smart Contract invocation script
    gas: 1500, // Optional, system fee
    fees: 1 // Optional, network fee
  })
  console.log('res', res)
}

async function transfer({ fromAccount, toAccount, amount }) {
  const intent = api.makeIntent({ GAS: amount }, toAccount.address)
  const apiProvider = new api.neoCli.instance(url)

  const res = await Neon.sendAsset({
    api: apiProvider, // Network
    account: fromAccount, // Your Account
    intents: intent, // Where you want to send assets to.
    gas: 0, // Optional, system fee
    fees: 0 // Optional, network fee
  })

  console.log('res', res)
}

async function invoke({ account, scriptHash, operation, args }) {
  console.log('args', args)
  // return
  const sb = Neon.create.scriptBuilder()
  // Your contract script hash, function name and parameters
  sb.emitAppCall(scriptHash, operation, args);

  // Returns a hexstring
  const script = sb.str

  const apiProvider = new api.neoCli.instance(url)
  // Neon API
  const res = await Neon.doInvoke({
    api: apiProvider,
    url: url,
    account,
    script,
    gas: 0,
    fees: 0
  })
  console.log('res', res)
}

async function query({ scriptHash, operation, args }) {
  const sb = Neon.create.scriptBuilder()
  sb.emitAppCall(scriptHash, operation, args);
  // Returns a hexstring
  const script = sb.str;

  // Using RPC Query to do local invocation
  const res = await rpc.Query.invokeScript(script).execute(url)
  console.log('res', res)
  console.log('stack', res.result.stack)
}

async function getRawTransaction(hash) {
  if (hash.startsWith('0x')) {
    hash = hash.slice(2)
  }

  const client = Neon.create.rpcClient(url)
  const verbose = 1
  const res = await client.getRawTransaction(hash, verbose)
  console.log('res', res)
}

async function sendTransaction({ account, receiver, gas }) {
  const intent = api.makeIntent({ GAS: gas }, receiver)

  // const network = new rpc.Network({
  //   name: net,
  //   protocol: protocol.ProtocolConfiguration
  // })

  const apiProvider = new api.neoCli.instance(url)

  // const apiProvider = new api.neoscan.instance('TestNet')
  // console.log('apiProvider', apiProvider)
  // Neon API
  const res = await Neon.sendAsset({
    api: apiProvider,
    account,
    intents: intent
  })
  console.log('res', res)
}

async function run() {
  // const tokenScriptHash = 'c9937a56c882087a204f0ab33a25fd7a5290ed27'
  const mainAccount = Neon.create.account(process.env.mainControlKey)
  console.log('mainAccount', mainAccount.address)
  const subAccount = Neon.create.account(process.env.subControlKey)
  console.log('subAccount', subAccount.address)

  // const num = new BigNumber('1000')
  // console.log('num', num.toString(16))

  // query({
  //   scriptHash: '1414b81e37a1b4248e0e5134155c71dd2e6a8cd9',
  //   operation: 'assetIsRegistered',
  //   args: ['901e4da39ecf91f5a513246db067c8485b1db6c8c155c84dc05a4fdb5dcf7683']
  // })
  // query({
  //   scriptHash: '1414b81e37a1b4248e0e5134155c71dd2e6a8cd9',
  //   operation: 'getRegistryKey',
  //   args: [
  //     '27ed90527afd253ab30a4f207a0882c8567a93c9',
  //     178,
  //     'db8afcccebc026c6cae1d541b25f80a83b065c8a',
  //     '7377746834',
  //     '901e4da39ecf91f5a513246db067c8485b1db6c8c155c84dc05a4fdb5dcf7683'
  //   ]
  // })
  // invoke({
  //   account: subAccount,
  //   scriptHash: '6992d8ba60540c7c5b464533543098a1bc04c040',
  //   operation: 'deploy',
  //   args: []
  // })
  // invoke({
  //   account: subAccount,
  //   scriptHash: '533fb0db7993b9f9d3acba4b798948ab2c354b0d',
  //   operation: 'lock',
  //   args: [
  //     '27ed90527afd253ab30a4f207a0882c8567a93c9', // fromAssetHash: swth_v2
  //     u.reverseHex(subAccount.scriptHash), // fromAddress
  //     181, // toChainId
  //     'db8afcccebc026c6cae1d541b25f80a83b065c8a', // targetProxyHash
  //     u.str2hexstring('swth2'), // toAssetHash
  //     '8eb00ad5e62947b77d89ad7ff62f23f5f406f019', // toAddress
  //     (new BigNumber(1000)).toNumber(), // amount
  //     false, // deductFeeInLock
  //     (new BigNumber(0)).toNumber(), // feeAmount
  //     'aa83739c25970ae1eddaa0b596835e4a9e12d3db' // feeAddress
  //   ]
  // })

  // const num = new BigNumber(Number.MAX_SAFE_INTEGER)
  // const num2 = new BigNumber(Number.MAX_SAFE_INTEGER)
  // const num3 = num.plus(num2)
  // console.log('num3', num.toString(), num3.toString(), num3.toNumber())

  // const hash = 'f96c5dc3e5c7774875d0e6d78f90b7eabc6ef8582ebdac0a989f9ef4b084195d'
  // await getBlock()

  const accBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', subAccount.address)
  console.log('accBalance', accBalance.toString())

  const lpBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', 'AGzAXWroWqR4nNzK8ULbLyWRsePCAqocDS')
  console.log('lpBalance', lpBalance.toString())

  // await getUnspents(subAccount.address)
  // await getRawTransaction(hash)
  // await transfer({
  //    fromAccount: mainAccount,
  //    toAccount: subAccount,
  //    amount: 1501
  // })
  // await deploy({
  //   name: 'Nep5ProxyPip1',
  //   script: proxyavm.script,
  //   account: subAccount,
  // })
  // await deploy({
  //   name: 'SWTH Token 6',
  //   script: tokenavm.script,
  //   account: subAccount
  // })

  // sendTransaction({
  //   account: mainAccount,
  //   receiver: subAccount.address,
  //   gas: 1
  // })
}

run()
