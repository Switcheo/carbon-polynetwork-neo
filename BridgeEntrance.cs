using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services.Neo;
using Neo.SmartContract.Framework.Services.System;
using System;
using System.ComponentModel;
using System.Numerics;

[assembly: Features(ContractPropertyState.HasStorage | ContractPropertyState.HasDynamicInvoke | ContractPropertyState.Payable)]

namespace BridgeEntrance
{
    // Nep5ProxyPip1 is a trustless duo lock proxy that allows safe permissionless adding of tokens to Switcheo TradeHub.
    public class BridgeEntranceContract : SmartContract
    {
        // Constants
        // MainNet: 5
        private static readonly BigInteger CounterpartChainID = new BigInteger(5);
        private static readonly byte Version = 0x01;
        // little endian 
        // MainNet: 7f25d672e8626d2beaa26f2cb40da6b91f40a382
        // TestNet: 1d012718c07eca226f5b5916fd9d8ff887a5df42
        private static readonly byte[] CCMCScriptHash = "1d012718c07eca226f5b5916fd9d8ff887a5df42".HexToBytes(); 
        // little endian
        // MainNet: 1f8966cd760cc8cd877b27ba1f4443059f664d16
        private static readonly byte[] lockProxyScriptHash = "1f8966cd760cc8cd877b27ba1f4443059f664d16".HexToBytes(); 
        // Dynamic Call
        private delegate object DynCall(string method, object[] args); // dynamic call

        // Events
        public static event Action<byte[], BigInteger, byte[], byte[], byte[]> LockEvent;

        public static object Main(string method, object[] args)
        {
            if (Runtime.Trigger == TriggerType.Application)
            {
                var callscript = ExecutionEngine.CallingScriptHash;

                if (method == "getVersion")
                    return GetVersion();
                if (method == "lock")
                    return Lock((byte[])args[0], (byte[])args[1], (byte[])args[2], (byte[])args[3], (byte[])args[4], (byte[])args[5], (byte[])args[6], (BigInteger)args[7], (BigInteger)args[8], (BigInteger)args[9], (byte[])args[10]);
            }
            return false;
        }

        [DisplayName("getVersion")]
        public static byte GetVersion()
        {
            return Version;
        }

        // used to lock asset into proxy contract
        [DisplayName("lock")]
        public static bool Lock(byte[] fromAssetHash, byte[] fromAddress, byte[] targetProxyHash, byte[] recoveryAddress, byte[] fromAssetDenom, byte[] toAssetDenom, byte[] toAddress, BigInteger amount, BigInteger feeAmount, BigInteger callAmount, byte[] feeAddress)
        {
            if (fromAssetHash.Length != 20)
            {
                Runtime.Notify("The parameter fromAssetHash SHOULD be 20-byte long.");
                return false;
            }
            if (fromAddress.Length != 20)
            {
                Runtime.Notify("The parameter fromAddress SHOULD be 20-byte long.");
                return false;
            }
            if (targetProxyHash.Length != 20)
            {
                Runtime.Notify("The parameter targetProxyHash SHOULD be be 20-byte long.");
                return false;
            }
            if (recoveryAddress.Length == 0)
            {
                Runtime.Notify("The parameter recoveryAddress SHOULD not be empty");
                return false;
            }
            if (fromAssetDenom.Length == 0)
            {
                Runtime.Notify("The parameter fromAssetDenom SHOULD not be empty.");
                return false;
            }
            if (toAssetDenom.Length == 0)
            {
                Runtime.Notify("The parameter toAssetDenom SHOULD not be empty.");
                return false;
            }
            if (toAddress.Length == 0)
            {
                Runtime.Notify("The parameter toAddress SHOULD not be empty.");
                return false;
            }
            if (amount <= 0)
            {
                Runtime.Notify("The parameter amount SHOULD not be less than 0.");
                return false;
            }
            if (feeAmount < 0)
            {
                Runtime.Notify("The parameter feeAmount SHOULD not be less than 0.");
                return false;
            }
            if (callAmount <= 0)
            {
                Runtime.Notify("The parameter callAmount SHOULD not be less than 0.");
                return false;
            }

            if (!AssetIsRegistered(fromAssetHash, targetProxyHash, fromAssetDenom))
            {
                Runtime.Notify("This asset has not yet been registered");
                return false;
            }

            if (feeAmount > amount)
            {
                Runtime.Notify("FeeAmount cannot be greater than Amount");
                return false;
            }

            // transfer asset from fromAddress to proxy contract address, use dynamic call to call nep5 token's contract "transfer"
            byte[] currentHash = ExecutionEngine.ExecutingScriptHash; // this proxy contract hash
            var nep5Contract = (DynCall)fromAssetHash.ToDelegate();
            bool success = (bool)nep5Contract("transfer", new object[] { fromAddress, lockProxyScriptHash, callAmount });
            if (!success)
            {
                Runtime.Notify("Failed to transfer NEP5 token to proxy contract.");
                return false;
            }

            var tx = (Transaction)ExecutionEngine.ScriptContainer;
            // construct args for proxy contract on target chain
            var inputArgs = SerializeArgs(fromAssetHash, fromAssetDenom, toAssetDenom, recoveryAddress, toAddress, amount, feeAmount, feeAddress);
            // construct params for CCMC
            var param = new object[] { CounterpartChainID, targetProxyHash, "unlock", inputArgs };

            // dynamic call CCMC
            var ccmc = (DynCall)CCMCScriptHash.ToDelegate();
            success = (bool)ccmc("CrossChain", param);
            if (!success)
            {
                Runtime.Notify("Failed to call CCMC.");
                return false;
            }

            LockEvent(fromAssetHash, CounterpartChainID, fromAssetDenom, recoveryAddress, inputArgs);

            return true;
        }

        public static bool AssetIsRegistered(byte[] assetHash, byte[] nativeLockProxy, byte[] nativeAssetHash)
        {
            var lockProxy = (DynCall)lockProxyScriptHash.ToDelegate();
            bool result = (bool)lockProxy("AssetIsRegistered", new object[] { assetHash, nativeLockProxy, nativeAssetHash });
            return result;
        }


        private static byte[] SerializeArgs(byte[] fromAssetAddress, byte[] fromAssetDenom, byte[] toAssetDenom, byte[] recoveryAddress, byte[] toAddress, BigInteger amount, BigInteger feeAmount, byte[] feeAddress)
        {
            var buffer = new byte[] { };
            buffer = WriteVarBytes(fromAssetAddress, buffer);
            buffer = WriteVarBytes(fromAssetDenom, buffer);
            buffer = WriteVarBytes(toAssetDenom, buffer);
            buffer = WriteVarBytes(recoveryAddress, buffer);
            buffer = WriteVarBytes(toAddress, buffer);
            buffer = WriteUint255(amount, buffer);
            buffer = WriteUint255(feeAmount, buffer);
            buffer = WriteVarBytes(feeAddress, buffer);
            return buffer;
        }

        private static byte[] WriteUint255(BigInteger value, byte[] source)
        {
            if (value < 0)
            {
                Runtime.Notify("Value out of range of uint255");
                return source;
            }
            var v = PadRight(value.ToByteArray(), 32);
            return source.Concat(v); // no need to concat length, fix 32 bytes
        }

        private static byte[] WriteVarInt(BigInteger value, byte[] Source)
        {
            if (value < 0)
            {
                return Source;
            }
            else if (value < 0xFD)
            {
                return Source.Concat(value.ToByteArray());
            }
            else if (value <= 0xFFFF) // 0xff, need to pad 1 0x00
            {
                byte[] length = new byte[] { 0xFD };
                var v = PadRight(value.ToByteArray(), 2);
                return Source.Concat(length).Concat(v);
            }
            else if (value <= 0XFFFFFFFF) //0xffffff, need to pad 1 0x00
            {
                byte[] length = new byte[] { 0xFE };
                var v = PadRight(value.ToByteArray(), 4);
                return Source.Concat(length).Concat(v);
            }
            else //0x ff ff ff ff ff, need to pad 3 0x00
            {
                byte[] length = new byte[] { 0xFF };
                var v = PadRight(value.ToByteArray(), 8);
                return Source.Concat(length).Concat(v);
            }
        }

        private static byte[] WriteVarBytes(byte[] value, byte[] Source)
        {
            return WriteVarInt(value.Length, Source).Concat(value);
        }

        // add padding zeros on the right
        private static byte[] PadRight(byte[] value, int length)
        {
            var l = value.Length;
            if (l > length)
                return value.Range(0, length);
            for (int i = 0; i < length - l; i++)
            {
                value = value.Concat(new byte[] { 0x00 });
            }
            return value;
        }
    }
}
