const Neon = require("@cityofzion/neon-js")
const protocol = require('./protocol.json')

const net = 'NeoDevNet'

async function run() {
  const account = Neon.default.create.account(process.env.controlKey)

  console.log('account', account.address)

  const network = new Neon.rpc.Network({
    name: net,
    protocol: protocol.ProtocolConfiguration
  })

  Neon.default.add.network(network)

  // const res = await Neon.rpc.Query.getUnspents('ALQmo14U6TVgPcEJAJjhKjsj4osbtswdMq').execute("http://seed2.ngd.network:10332")
  // console.log('res', res.result)

  // const res = await Neon.rpc.Query.getUnspents('Acrazuc9WEQohbATTWtwYeYz4rcQE4vebM').execute("http://47.89.240.111:11333")
  // console.log('res', res.result)

  const res = await Neon.rpc.Query.getBlock(1).execute("https://47.89.240.111:13332");
  console.log('res', res)
}

run()
