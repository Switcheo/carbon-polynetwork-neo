setNeonApiProvider(networkToCall);

//Notify user if contract exists
getContractState(contract_scripthash, false);


// ================================================================================
// automatic claim
var availableGAS = Number($("#walletGas"+idToInvoke)[0].innerHTML);
var availableClaim = Number($("#walletUnclaim"+idToInvoke).val());
var totalGasNeeded = mynetfee+mysysgasfee+gas;
if( totalGasNeeded > availableGAS)
{
   // needs more than availableGAS, will try to claim

  console.log("availableGAS: "+ availableGAS + "\t availableClaim:" + availableClaim + " - totalGasNeeded:" + totalGasNeeded);
  if( totalGasNeeded >= (availableGAS + availableClaim))
  {
      console.log("Self transfer activated. Required amount of GAS will be claimed!");
      createNotificationOrAlert("InvocationTransaction_Invoke", "Self transfer activated. Required amount of GAS will be claimed!", 7000);
      selfTransfer(idToInvoke);
      return;
  }
   else
  {
      console.error("No GAS for this transfer, even if claiming!");
      return;
  }
}
// ================================================================================

var intent = createGasAndNeoIntent(toBase58(contract_scripthash), neo, gas);

for (var i = 0; i < neonJSParams.length; i++)
    console.log(JSON.stringify(neonJSParams[i]));
var sb = Neon.default.create.scriptBuilder(); //new ScriptBuilder();
// PUSH parameters BACKWARDS!!
for (var i = neonJSParams.length - 1; i >= 0; i--)
    sb._emitParam(neonJSParams[i]);
sb._emitAppCall(contract_scripthash, false); // tailCall = false
var myscript = sb.str;

var constructTx = NEON_API_PROVIDER.getBalance(ECO_WALLET[idToInvoke].account.address).then(balance => {
    // Create invocation transaction with desired systemgas (param gas)
    let transaction = new Neon.tx.InvocationTransaction({
        gas: mysysgasfee
    });

    // Attach intents
    if (neo > 0)
        transaction.addIntent("NEO", neo, toBase58(contract_scripthash));
    if (gas > 0)
        transaction.addIntent("GAS", gas, toBase58(contract_scripthash));

    // addint invocation script
    transaction.script = myscript;

    // Attach extra network fee when calculating inputs and outputs
    transaction.calculate(balance, null, mynetfee);

    return transaction;
});

var invokeParams = transformInvokeParams(ECO_WALLET[idToInvoke].account.address, mynetfee, mysysgasfee, neo, gas, neonJSParams, contract_scripthash);
console.log(invokeParams);
console.log(invokeParams.contract_scripthash);
// Advanced signing should only forward transaction attributes to textbox
if ($("#cbxAdvSignToggle")[0].checked) {
    PendingTX = constructTx;
    PendingTXParams = invokeParams;
    PendingTX.then(transaction => {
        $("#tx_AdvancedSigning_ScriptHash").val(transaction.hash);
        $("#txScript_advanced_signing").val(transaction.serialize(false));
        $("#tx_AdvancedSigning_Size").val(transaction.serialize(true).length / 2);
        $("#tx_AdvancedSigning_HeaderSize").val(transaction.serialize(false).length / 2);
    });
} else {
    console.log("Invoke Signing...");
    const signedTx = signTXWithSingleSigner(ECO_WALLET[idToInvoke].account, constructTx);

    console.log("Invoke Sending...");
    var txHash;
    const sendTx = signedTx
        .then(transaction => {
            txHash = transaction.hash;
            const client = new Neon.rpc.RPCClient(BASE_PATH_CLI);
            return client.sendRawTransaction(transaction.serialize(true));
        })
        .then(res => {
    handleInvoke(res, txHash, invokeParams, contract_scripthash);
        })
        .catch(handleErrorInvoke);
}
