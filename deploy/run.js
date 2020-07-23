const { default: Neon, tx, wallet, rpc, u } = require("@cityofzion/neon-js");
const protocol = require('./protocol.json')
const proxyavm = require('./nep5proxypip1.json')
// const proxyavm = require('./avmexample.json')

// neo devnet ccmc: de3ba846755178778c38a149d0fe0812d540c127
// https://github.com/polynetwork/docs/blob/master/config/README_DevNet.md

// input txns:
// 0xb7715f82306a2d241aa9f841600eff82ba7f932cd8f22575cf86ebf0d2f7139c
// 0x6706e864fc71ba2ac29a0925b0c5eeedc76df2fd4546cd2e2fcad7193bd9171f

const net = 'NeoDevNet'
const url = 'http://47.89.240.111:12332'

function addNetwork() {
  const network = new rpc.Network({
    name: net,
    protocol: protocol.ProtocolConfiguration
  })

  Neon.add.network(network)
}

async function getBlock(address) {
  const res = await rpc.Query.getBlock(1).execute(url)
  console.log('res', res.result)
}

async function getUnspents(address) {
  const res = await rpc.Query.getUnspents(address).execute(url)
  console.log('res', res.result)
}

async function deploy(name, script, account) {
  const params = {
    script: script.trim(),
    name,
    version: '1.0',
    author: 'John',
    email: 'john.wong@switcheo.network',
    description: '',
    needsStorage: true,
    parameterList: '0710',
    returnType: '05',
  }
  const sb = Neon.create.deployScript(params)

  // create raw invocation transaction
  let rawTransaction = new tx.InvocationTransaction({
    script: sb.str,
    gas: 1000
  })

  let inputObj = {
    prevHash: "b7715f82306a2d241aa9f841600eff82ba7f932cd8f22575cf86ebf0d2f7139c",
    prevIndex: 1
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

async function run() {
  const account = Neon.create.account(process.env.controlKey)
  console.log('account', account.address)
  await deploy('Nep5ProxyPip1', proxyavm.script, account)
}

run()
