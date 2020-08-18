const { default: Neon, tx, wallet, rpc, u, nep5, api, CONST } = require("@cityofzion/neon-js");
const BigNumber = require('bignumber.js');

const protocol = require('./protocol.json')
const proxyavm = require('./nep5proxypip1.json')
const tokenavm = require('./swthtoken.json')

// neo devnet ccmc: de3ba846755178778c38a149d0fe0812d540c127
// https://github.com/polynetwork/docs/blob/master/config/README_DevNet.md

// contract script hashes (big endian => little endian):
// lockproxy v3.19: 6facde7eb7a8dae4ae3ee3557c2d26558b02d409 => 09d4028b55262d7c55e33eaee4daa8b77edeac6f
// lockproxy v3.20: aaeb1e6ed5f789a4e9febbee5e59edfb6a47212c
// lockproxy v3.21: ceb996f5ef78473ba305fb37cab50218d25b7a5a
// lockproxy v3.22: da6f7917af5f565d46eeeb0d763c9584c9234e8c
// lockproxy v3.22: 109c7f5d53dbc043a2ebaf051e51b305c1cf1cc8
// lockproxy v3.23: 7579283605ec18af1313ee8b8f7576d7681591a0
// lockproxy v3.23: 7ef72e0cbdd1c651ca31fe3859a2bf06219e185a
// lockproxy v3.24: f563cf6250fae2f81e6ef3a315726e4d51a4d256
// lockproxy v3.25: e7eaa8b61702f77db667cc5e7dc593d9c1cfe0de => dee0cfc1d993c57d5ecc67b67df70217b6a8eae7
// lockproxy v3.26: 51039e4120fea26c398d4e3464a202d655996d71 => 716d9955d602a264344e8d396ca2fe20419e0351

// mainnet lockproxy v3.0: cd19745dbf1305f206978ddcfdcb7fca6ef6d017 => 17d0f66eca7fcbfddc8d9706f20513bf5d7419cd

// lock: 9db46955cbd589080436baecdf3592d5affaba255c1a9549d6d786cade29c852 => error: value out of range

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
    gas: 1000, // Optional, system fee
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

async function invokeScript({ account, script }) {
  const apiProvider = new api.neoCli.instance(url)
  // Neon API
  const res = await Neon.doInvoke({
    api: apiProvider,
    url: url,
    account,
    script,
    gas: 20,
    fees: 0
  })
  console.log('res', res)
}

async function sendWithdrawTxn(account, assetHash) {
  const scriptHash = "e7eaa8b61702f77db667cc5e7dc593d9c1cfe0de" // big endian
  const props = {
    scriptHash,
    operation: "withdraw",
    args: [],
    useTailCall: true
  }
  const script = Neon.create.script(props)

  // create raw invocation transaction
  let rawTransaction = new tx.InvocationTransaction({
    script,
    gas: 0
  })

  // attach contract as signer
  rawTransaction.addAttribute(
    tx.TxAttrUsage.Script,
    u.reverseHex(scriptHash)
  )

  // withdraw asset
  rawTransaction.addAttribute(
    0xa2,
    u.reverseHex(assetHash).padEnd(64, '0'),
  )

  // withdraw address
  rawTransaction.addAttribute(
    0xa4,
    u.reverseHex(wallet.getScriptHashFromAddress(account.address)).padEnd(64, '0'),
  )

  const inputObj = {
    prevHash: 'fba1f010ab192feaf0946ec6b689103048d19e3ae09cbfdb6cc94dc440f56107',
    prevIndex: 0
  }

  const outputObj = {
    assetId: CONST.ASSET_ID.GAS,
    value: 0.1,
    scriptHash: account.scriptHash
  }

  rawTransaction.inputs[0] = new tx.TransactionInput(inputObj)
  rawTransaction.addOutput(new tx.TransactionOutput(outputObj))

  // sign txn
  const signature = wallet.sign(
    rawTransaction.serialize(false),
    account.privateKey
  )

  // add user witness
  rawTransaction.addWitness(
    tx.Witness.fromSignature(signature, account.publicKey)
  )

  // add contract additional witness
  const witness = new tx.Witness({
    invocationScript: '0000',
    verificationScript: '',
  })
  witness.scriptHash = scriptHash
  rawTransaction.addWitness(witness)

  console.log('rawTransaction', rawTransaction)
  console.log('rawTransaction.hash', rawTransaction.hash)

  // Send raw transaction
  // const client = new rpc.RPCClient(url);
  // const res = await client.sendRawTransaction(rawTransaction)
  // console.log('res', res)
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

async function deployLockProxy(account) {
  await deploy({
    name: 'Nep5ProxyPip1',
    script: proxyavm.script,
    account: account,
  })
}

async function sendLockTxn(account) {
  const nonce = Math.floor(Math.random() * 1000000)

  invoke({
    account: account,
    scriptHash: '51039e4120fea26c398d4e3464a202d655996d71',
    operation: 'lock',
    args: [
      '27ed90527afd253ab30a4f207a0882c8567a93c9', // fromAssetHash: swth_v2
      u.reverseHex(account.scriptHash), // fromAddress
      'db8afcccebc026c6cae1d541b25f80a83b065c8a', // targetProxyHash
      u.str2hexstring('swth24'), // toAssetHash
      'fbd171408fef58a5590f4d237680ab43b2add4d4', // toAddress
      (new BigNumber(1000)).toNumber(), // amount
      (new BigNumber(0)).toNumber(), // feeAmount
      'aa83739c25970ae1eddaa0b596835e4a9e12d3db', // feeAddress
      nonce
    ]
  })
  // invoke({
  //   account: account,
  //   scriptHash: '2266efd4a7fce62f3ac9511db2f3b171ceb26fc9',
  //   operation: 'lock',
  //   args: [
  //     186, // toChainId
  //     'db8afcccebc026c6cae1d541b25f80a83b065c8a', // targetProxyHash
  //     '8eb00ad5e62947b77d89ad7ff62f23f5f406f019', // inputArgs
  //   ]
  // })
}

async function run() {
  // const tokenScriptHash = 'c9937a56c882087a204f0ab33a25fd7a5290ed27'
  const mainAccount = Neon.create.account(process.env.mainControlKey)
  console.log('mainAccount', mainAccount.address)
  const subAccount = Neon.create.account(process.env.subControlKey)
  console.log('subAccount', subAccount.address)

  // await deployLockProxy(mainAccount)
  await sendLockTxn(subAccount)
  // await sendWithdrawTxn(mainAccount, 'c9937a56c882087a204f0ab33a25fd7a5290ed27')

  // const mainAccBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', mainAccount.address)
  // console.log('mainAccBalance', mainAccBalance.toString())
  //
  // const subAccBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', subAccount.address)
  // console.log('subAccBalance', subAccBalance.toString())
  //
  // const lpAddress = 'Ac6LyGL9oAzAj83NAEnH1EByYoxettbX6S'
  // const lpBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', lpAddress)
  // console.log('lpBalance', lpBalance.toString())

  // await transfer({
  //    fromAccount: mainAccount,
  //    toAccount: subAccount,
  //    amount: 1001
  // })

  // await transfer({
  //    fromAccount: subAccount,
  //    toAccount: mainAccount,
  //    amount: 0.1
  // })

  // await invokeScript({
  //   account: subAccount,
  //   script: '4d450195134fdb1b329db8bc2d3dbab7278301abd7e1217f38408a67d7b7f4ae07fac06981d88029c4ad0682c4dd81496937c174b91e853d64c6b65dd19fa5e60e377901ac28e1eaf0054ce2cc1700f2a950fca838b2df250b65b6d60a979ca77d8f6bb94bcf11deb695baab97e0af206038a62fafa8beea7f3a4df7448306c75ec467f601a2ef497c9c3b560e093f3c0d6e0e06235614d170586405337e5f3536e3e8e5c37a2e2d2f044ed7dbc2c8cf79d0a58d224c4c38639cab93d7720101fd78eef52d0025e90a9087d9fb9d5415990725d56c9013b46e58c6991b2ed711d65c624561cf238f7b46617d46ba8a992a08337fb731ed2cd4bb5a551865ef2ae5857ba7516101242459f612ed0c833ae2aa1af2025d77da3152477b3b8e76d83002d4f91364ed7f74734b6c853d81ef60ea35f896bda5f03b8ce1954fe25ce4cbd538676b92c80000004dbf01000000009b91561700000000c3bd8952ea26e469e465522ded94f7773663dca90caf73ddedd44de822a3bcb10000000000000000000000000000000000000000000000000000000000000000d7fc1b3f7aa1583a558a336fb4e63018fa89d2e51db1728d1ac4ace1644ce3fce2909ba25ef475a5f97c3e5479836f757407ed9410517bf1ebb1422ea1b60b5b8133355f730c0000c68365cb3bf5314bfd0c017b226c6561646572223a342c227672665f76616c7565223a224250576a4245546a714373702f366f3037514a49384837354864594b326759426e766c735a4d57625934656e2f384164515a6173314a73763066347154314c6650433570726c5a72576f64716d703530355562776439673d222c227672665f70726f6f66223a224a786530726d6f48426c554433634a503565612f44375a6e6d7a4c554f66787a5a79566b416735616b726463497636474e6f556c663671336136694d5651544155354f624762534d587a414c494e716d397173716d513d3d222c226c6173745f636f6e6669675f626c6f636b5f6e756d223a302c226e65775f636861696e5f636f6e666967223a6e756c6c7d00000000000000000000000000000000000000004d3001fd2d0120872583e4c5b02854c61bd951a8c677212c31968b791b9b667c3325b6370437f6ba0000000000000020addfa2773e36a34e96e4b6fc0d8c685de619ac0d7fcec2148262b93bf509a933010a14db8afcccebc026c6cae1d541b25f80a83b065c8a04000000000000001409d4028b55262d7c55e33eaee4daa8b77edeac6f06756e6c6f636ba7067377746831301427ed90527afd253ab30a4f207a0882c8567a93c914e73ed2f9ca9bc382547d7712b6ee7e8d17b9e9b96400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014aa83739c25970ae1eddaa0b596835e4a9e12d3db00010000000000000000000000000000000000000000000000000000000000000055c112566572696679416e64457865637574655478671d012718c07eca226f5b5916fd9d8ff887a5df42'
  // })
  // const num = new BigNumber('1000')
  // console.log('num', num.toString(16))

  // query({
  //   scriptHash: 'e7eaa8b61702f77db667cc5e7dc593d9c1cfe0de',
  //   operation: 'getWithdrawingBalance',
  //   args: ['27ed90527afd253ab30a4f207a0882c8567a93c9', 'e73ed2f9ca9bc382547d7712b6ee7e8d17b9e9b9']
  // })

  // query({
  //   scriptHash: '533fb0db7993b9f9d3acba4b798948ab2c354b0d',
  //   operation: 'assetIsRegistered',
  //   args: ['b2dfb5059d06e70010b355e13c730bfc03cd13473a338a369e6b4fcee3fbcc7b']
  // })
  // query({
  //   scriptHash: '533fb0db7993b9f9d3acba4b798948ab2c354b0d',
  //   operation: 'getLockedBalance',
  //   args: [
  //     '27ed90527afd253ab30a4f207a0882c8567a93c9',
  //     181,
  //     'db8afcccebc026c6cae1d541b25f80a83b065c8a',
  //     u.str2hexstring('swth2')
  //   ]
  // })
  // query({
  //   scriptHash: '533fb0db7993b9f9d3acba4b798948ab2c354b0d',
  //   operation: 'getRegistryKey',
  //   args: [
  //     '27ed90527afd253ab30a4f207a0882c8567a93c9',
  //     181,
  //     'db8afcccebc026c6cae1d541b25f80a83b065c8a',
  //     u.str2hexstring('swth2')
  //   ]
  // })
  // invoke({
  //   account: subAccount,
  //   scriptHash: '6992d8ba60540c7c5b464533543098a1bc04c040',
  //   operation: 'deploy',
  //   args: []
  // })

  // const num = new BigNumber(Number.MAX_SAFE_INTEGER)
  // const num2 = new BigNumber(Number.MAX_SAFE_INTEGER)
  // const num3 = num.plus(num2)
  // console.log('num3', num.toString(), num3.toString(), num3.toNumber())

  // const hash = 'f96c5dc3e5c7774875d0e6d78f90b7eabc6ef8582ebdac0a989f9ef4b084195d'
  // await getBlock()
  // const mainAccBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', mainAccount.address)
  // console.log('mainAccBalance', mainAccBalance.toString())
  //
  // const subAccBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', subAccount.address)
  // console.log('subAccBalance', subAccBalance.toString())
  //
  // const lpBalance = await nep5.getTokenBalance(url, 'c9937a56c882087a204f0ab33a25fd7a5290ed27', 'AGzAXWroWqR4nNzK8ULbLyWRsePCAqocDS')
  // console.log('lpBalance', lpBalance.toString())

  // await getUnspents(mainAccount.address)
  // await getRawTransaction(hash)
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
