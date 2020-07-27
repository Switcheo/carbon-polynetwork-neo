const { default: Neon, tx, wallet, rpc, u, nep5, api, CONST } = require("@cityofzion/neon-js");
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

// deploy txns:
// lockproxy v2: d41836a79732c3077a175aabe4dc28ae823eedc51ed7f01f7887c65bb29c477d
// swth v1: ca8da41a697cd5bc646b2bfc67d6c10e4d3a2620f9cc996b2d1cedecc1c9fdc0
// swth v2: 5c0a483cc2a331ec9eb280b819d5584beb95f7a163fd667f344bacc1e1c8fbd3

// contract script hashes:
// lockproxy v1: 8a7297e50d0d952e67f798719ed31b4528cc6ae3
// lockproxy v2: 0e2d9fd9f03f00dbdf85fa34e760ca4333d46312
// swth v1: a37f9d94d45138e435f6dfe0bb5a04422b1e7f0e
// swth v2: c9937a56c882087a204f0ab33a25fd7a5290ed27

// invocation txns:
// swth_v2.deploy: 8fd47f792f7a0cd0ba511b221071ce21b2022d857eec0bd6eead8e3fe01492ce

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

async function deploy({ name, script, account, prevHash, prevIndex }) {
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

  // create raw invocation transaction
  let rawTransaction = new tx.InvocationTransaction({
    script: sb.str,
    gas: 1500
  })

  let inputObj = {
    prevHash,
    prevIndex
  }

  rawTransaction.inputs[0] = new tx.TransactionInput(inputObj);

  // Sign transaction with sender's private key
  const signature = wallet.sign(
    rawTransaction.serialize(false),
    account.privateKey
  )

  // Add witness
  rawTransaction.addWitness(
    tx.Witness.fromSignature(signature, account.publicKey)
  )

  console.log('rawTransaction.hash', rawTransaction.hash)

  // Send raw transaction
  const client = new rpc.RPCClient(url)
  client.sendRawTransaction(rawTransaction)
        .then(res => { console.log(res) })
        .catch(err => { console.log(err) })
}

async function transfer({ fromAccount, toAccount, prevHash, prevIndex, amount, refundAmount }) {
  let rawTransaction = Neon.create.contractTx()
  const inputObj = {
    prevHash,
    prevIndex
  }
  const outputObj1 = {
    assetId: CONST.ASSET_ID.GAS,
    value: refundAmount,
    scriptHash: fromAccount.scriptHash
  }

  const outputObj2 = {
    assetId: CONST.ASSET_ID.GAS,
    value: amount,
    scriptHash: toAccount.scriptHash
  }

  rawTransaction.inputs[0] = new tx.TransactionInput(inputObj)
  rawTransaction.addOutput(new tx.TransactionOutput(outputObj1))
  rawTransaction.addOutput(new tx.TransactionOutput(outputObj2))

  const signature = wallet.sign(
    rawTransaction.serialize(false),
    fromAccount.privateKey
  )
  rawTransaction.addWitness(
    tx.Witness.fromSignature(signature, fromAccount.publicKey)
  )

  console.log('rawTransaction.hash', rawTransaction.hash)
  // Send raw transaction
  const client = new rpc.RPCClient(url)
  client.sendRawTransaction(rawTransaction)
        .then(res => { console.log(res) })
        .catch(err => { console.log(err) })
}

async function invoke(account, scriptHash, operation, args) {
  const props = {
    scriptHash: scriptHash,
    operation: operation,
    args: args
  }
  const script = Neon.create.script(props)

  // create raw invocation transaction
  let rawTransaction = new tx.InvocationTransaction({
    script: script,
    gas: 0
  })

  // Build input objects and output objects.
  rawTransaction.addAttribute(
    tx.TxAttrUsage.Script,
    u.reverseHex(wallet.getScriptHashFromAddress(account.address))
  );

  // Sign transaction with sender's private key
  const signature = wallet.sign(
    rawTransaction.serialize(false),
    account.privateKey
  )

  // Add witness
  rawTransaction.addWitness(
    tx.Witness.fromSignature(signature, account.publicKey)
  )

  console.log('rawTransaction.hash', rawTransaction.hash)

  // Send raw transaction
  const client = new rpc.RPCClient(url)
  client.sendRawTransaction(rawTransaction)
        .then(res => { console.log(res) })
        .catch(err => { console.log(err) })

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

async function getNep5Balance() {

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
  const tokenScriptHash = 'c9937a56c882087a204f0ab33a25fd7a5290ed27'
  const mainAccount = Neon.create.account(process.env.mainControlKey)
  console.log('mainAccount', mainAccount.address)
  const subAccount = Neon.create.account(process.env.subControlKey)
  console.log('subAccount', subAccount.address)

  // Lock(
  //   byte[] fromAssetHash,
  //   byte[] fromAddress,
  //   BigInteger toChainId,
  //   byte[] targetProxyHash,
  //   byte[] toAssetHash,
  //   byte[] toAddress,
  //   BigInteger amount,
  //   bool deductFeeInLock,
  //   BigInteger feeAmount, byte[] feeAddress
  // )

  // await invoke(subAccount, tokenScriptHash, 'deploy', [])
  // const hash = 'fefa66d14b55dad4fe18c8f7ef545278a0adb0dee22eaa5e4f561315fb0818d5'
  // await getBlock()

  // const balance = await nep5.getTokenBalance(url, tokenScriptHash, subAccount.address)
  // console.log('balance', balance.toString())

  // const balance = await nep5.getTokenBalance('https://seed1.switcheo.network:10331', 'ab38352559b8b203bde5fddfa0b07d8b2525e132', 'ALQmo14U6TVgPcEJAJjhKjsj4osbtswdMq')
  // console.log('balance', balance.toString())

  await getUnspents(subAccount.address)
  // await getRawTransaction(hash)
  // await transfer({
  //    fromAccount: mainAccount,
  //    toAccount: subAccount,
  //    prevHash: hash,
  //    prevIndex: 0,
  //    amount: '1501',
  //    refundAmount: '81995'
  // })
  // await deploy({
  //   name: 'Nep5ProxyPip1',
  //   script: proxyavm.script,
  //   account: subAccount,
  //   prevHash: hash,
  //   prevIndex: 1
  // })
  // await deploy({
  //   name: 'SWTH Token',
  //   script: tokenavm.script,
  //   account: subAccount,
  //   prevHash: hash,
  //   prevIndex: 1
  // })

  // sendTransaction({
  //   account: mainAccount,
  //   receiver: subAccount.address,
  //   gas: 1
  // })
}

run()
