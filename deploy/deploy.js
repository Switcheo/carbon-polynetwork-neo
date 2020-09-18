const { default: Neon, tx, wallet, rpc, u, nep5, api, CONST } = require("@cityofzion/neon-js");
const BigNumber = require('bignumber.js');

const protocol = require('./protocol.json')
const proxyavm = require('./nep5proxypip1.json')

const net = 'NeoDevNet'
const url = 'http://13.82.229.252:11332'

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

async function run() {
  const mainAccount = Neon.create.account(process.env.mainControlKey)
  console.log('mainAccount', mainAccount.address)
  const subAccount = Neon.create.account(process.env.subControlKey)
  console.log('subAccount', subAccount.address)

  await deployLockProxy(mainAccount)
}

run()
