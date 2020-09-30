
const { default: Neon, rpc } = require("@cityofzion/neon-js");

const protocol = require('./protocol.json')

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

async function getRawTransaction(hash) {
  if (hash.startsWith('0x')) {
    hash = hash.slice(2)
  }

  const client = Neon.create.rpcClient(url)
  const verbose = 1
  const res = await client.getRawTransaction(hash, verbose)
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
