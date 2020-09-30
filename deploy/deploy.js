const { default: Neon, api } = require("@cityofzion/neon-js");
const proxyavm = require('./nep5proxypip1.json')

const net = 'NeoDevNet'
const url = 'http://13.82.229.252:11332'

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
    author: 'Switcheo',
    email: 'engineering@switcheo.network',
    description: 'Switcheo TradeHub LockProxy Test',
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

  console.log({ res })
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
  console.log('deploying with: ', mainAccount.address)

  await deployLockProxy(mainAccount)
}

run()
