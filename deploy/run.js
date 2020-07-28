const { default: Neon, tx, wallet, rpc, u, nep5, api, CONST } = require("@cityofzion/neon-js");
const protocol = require('./protocol.json')
const proxyavm = require('./nep5proxypip1.json')
const tokenavm = require('./swthtoken.json')

const SWTH_CHAIN_ID = 178

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

// deploy txns:
// lockproxy v2: d41836a79732c3077a175aabe4dc28ae823eedc51ed7f01f7887c65bb29c477d
// swth v1: ca8da41a697cd5bc646b2bfc67d6c10e4d3a2620f9cc996b2d1cedecc1c9fdc0
// swth v2: 5c0a483cc2a331ec9eb280b819d5584beb95f7a163fd667f344bacc1e1c8fbd3
// swth v2.1: b72e737ca2cfe273ca67dd8cbab38fcb1abea37f9ca76e0a529087da5832102b
// swth v2.2: 51d9d5b41f305c3443e38a303c63d81990434cf83f9bf2fa4c8e7d5b5b675b0c

// contract script hashes:
// lockproxy v1: 8a7297e50d0d952e67f798719ed31b4528cc6ae3
// lockproxy v2: 0e2d9fd9f03f00dbdf85fa34e760ca4333d46312
// swth v1: a37f9d94d45138e435f6dfe0bb5a04422b1e7f0e
// swth v2: c9937a56c882087a204f0ab33a25fd7a5290ed27 => 27ed90527afd253ab30a4f207a0882c8567a93c9
// lockproxy v2.1: fa992729c38778afbf8dba51c5bc546611aba08a => 8aa0ab116654bcc551ba8dbfaf7887c3292799fa
// lockproxy v2.2: 97b13d8f09d8ee8e3203359e6204156004de3499 => 9934de04601504629e3503328eeed8098f3db197

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
// lock: cd0d4c165e707e059563a9ca587f2c93e571c70488429bc96a523bde1c00c5ac => error: "This asset has not yet been registered"
// lock: b8b7985cd013a960a84d991f2a5639ec4f84bfbd1ba9be6b180eb1ca1f53fb56 => error: "This asset has not yet been registered"

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

Lock(
  byte[] fromAssetHash, '27ed90527afd253ab30a4f207a0882c8567a93c9'
  byte[] fromAddress, '243486261a8a64639b1d0bae0c31da84a641960c'
  BigInteger toChainId, 178
  byte[] targetProxyHash, 'db8afcccebc026c6cae1d541b25f80a83b065c8a'
  byte[] toAssetHash, '7377746833'
  byte[] toAddress, 'db8afcccebc026c6cae1d541b25f80a83b065c8a'
  BigInteger amount, '777777777777'
  bool deductFeeInLock, false
  BigInteger feeAmount, '77777777'
  byte[] feeAddress '989761fb0c0eb0c05605e849cae77d239f98ac7f'
)

args [
  178,
  'db8afcccebc026c6cae1d541b25f80a83b065c8a',
  '7377746833',
  'db8afcccebc026c6cae1d541b25f80a83b065c8a',
  '777777777777',
  false,
  '77777777',
  '989761fb0c0eb0c05605e849cae77d239f98ac7f'
]

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

  invoke({
    account: subAccount,
    scriptHash: 'fa992729c38778afbf8dba51c5bc546611aba08a',
    operation: 'lock',
    args: [
      '27ed90527afd253ab30a4f207a0882c8567a93c9', // fromAssetHash: swth_v2
      u.reverseHex(subAccount.scriptHash), // fromAddress
      SWTH_CHAIN_ID, // toChainId
      'db8afcccebc026c6cae1d541b25f80a83b065c8a', // targetProxyHash
      u.str2hexstring('swth3'), // toAssetHash
      'db8afcccebc026c6cae1d541b25f80a83b065c8a', // toAddress
      '777777777777', // amount
      false, // deductFeeInLock
      '77777777', // feeAmount
      '989761fb0c0eb0c05605e849cae77d239f98ac7f' // feeAddress
    ]
  })

  // const hash = '63d0f30f978607f1ca8f08d2c05196d17e786f3849d27b6c7ff8ef96d2f653cc'
  // await getBlock()

  // const balance = await nep5.getTokenBalance(url, tokenScriptHash, subAccount.address)
  // console.log('balance', balance.toString())

  // const balance = await nep5.getTokenBalance('https://seed1.switcheo.network:10331', 'ab38352559b8b203bde5fddfa0b07d8b2525e132', 'ALQmo14U6TVgPcEJAJjhKjsj4osbtswdMq')
  // console.log('balance', balance.toString())

  // await getUnspents(subAccount.address)
  // await getRawTransaction(hash)
  // await transfer({
  //    fromAccount: mainAccount,
  //    toAccount: subAccount,
  //    prevHash: hash,
  //    prevIndex: 0,
  //    amount: '1501',
  //    refundAmount: '78992'
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
