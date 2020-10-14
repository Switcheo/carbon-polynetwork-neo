using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services.Neo;
using Neo.SmartContract.Framework.Services.System;
using System;
using System.ComponentModel;
using System.Numerics;

[assembly: Features(ContractPropertyState.HasStorage | ContractPropertyState.HasDynamicInvoke | ContractPropertyState.Payable)]

namespace Nep5Proxy
{
    // Nep5ProxyPip1 is a trustless duo lock proxy that allows safe permissionless adding of tokens to Switcheo TradeHub.
    public class Nep5ProxyPip1 : SmartContract
    {
        // Constants
        private static readonly BigInteger CounterpartChainID = new BigInteger(192); // MainNet: 4
        private static readonly byte Version = 0x05;
        private static readonly byte[] CCMCScriptHash = "1d012718c07eca226f5b5916fd9d8ff887a5df42".HexToBytes(); // little endian // MainNet: 7f25d672e8626d2beaa26f2cb40da6b91f40a382

        // Dynamic Call
        private delegate object DynCall(string method, object[] args); // dynamic call

        // Events
        public static event Action<byte[], BigInteger, byte[], byte[]> RegisterAssetEvent;
        public static event Action<byte[], byte[], BigInteger, byte[], byte[], BigInteger, byte[]> LockEvent;
        public static event Action<byte[], byte[], BigInteger, byte[]> UnlockEvent;

        public static object Main(string method, object[] args)
        {
            if (Runtime.Trigger == TriggerType.Application)
            {
                var callscript = ExecutionEngine.CallingScriptHash;

                if (method == "getVersion")
                    return GetVersion();
                if (method == "getAssetBalance")
                    return GetAssetBalance((byte[])args[0]);
                if (method == "getRegistryValue")
                    return GetRegistryValue((byte[])args[0]);
                if (method == "registerAsset")
                    return RegisterAsset((byte[])args[0], (byte[])args[1], (BigInteger)args[2], callscript);
                if (method == "lock")
                    return Lock((byte[])args[0], (byte[])args[1], (byte[])args[2], (byte[])args[3], (byte[])args[4], (BigInteger)args[5], (BigInteger)args[6], (byte[])args[7], (BigInteger)args[8]);
                if (method == "unlock")
                    return Unlock((byte[])args[0], (byte[])args[1], (BigInteger)args[2], callscript);
            }

            return false;
        }

        [DisplayName("getVersion")]
        public static byte GetVersion()
        {
            return Version;
        }

        [DisplayName("getAssetBalance")]
        public static BigInteger GetAssetBalance(byte[] assetHash)
        {
            byte[] currentHash = ExecutionEngine.ExecutingScriptHash; // this proxy contract hash
            var nep5Contract = (DynCall)assetHash.ToDelegate();
            BigInteger balance = (BigInteger)nep5Contract("balanceOf", new object[] { currentHash });
            return balance;
        }

        // called by the CCM to register assets from a connected chain
#if DEBUG
        [DisplayName("registerAsset")] //Only for ABI file
        public static bool RegisterAsset(byte[] inputBytes, byte[] fromProxyContract, BigInteger fromChainId) => true;
#endif
        private static bool RegisterAsset(byte[] inputBytes, byte[] fromProxyContract, BigInteger fromChainId, byte[] caller)
        {
            if (fromChainId != CounterpartChainID)
            {
                Runtime.Notify("Invalid fromChainId");
                return false;
            }

            //only allowed to be called by CCMC
            if (caller.AsBigInteger() != CCMCScriptHash.AsBigInteger())
            {
                Runtime.Notify("Only allowed to be called by CCMC");
                Runtime.Notify(caller);
                Runtime.Notify(CCMCScriptHash);
                return false;
            }

            object[] results = DeserializeRegisterAssetArgs(inputBytes);
            var assetHash = (byte[])results[0];
            var nativeAssetHash = (byte[])results[1];

            bool success = MarkAssetAsRegistered(nativeAssetHash, fromProxyContract, assetHash);
            if (!success)
            {
                Runtime.Notify("Could not register asset");
                return false;
            }

            RegisterAssetEvent(nativeAssetHash, CounterpartChainID, fromProxyContract, assetHash);

            return true;
        }

        // used to lock asset into proxy contract
        [DisplayName("lock")]
        public static bool Lock(byte[] fromAssetHash, byte[] fromAddress, byte[] targetProxyHash, byte[] toAssetHash, byte[] toAddress, BigInteger amount, BigInteger feeAmount, byte[] feeAddress, BigInteger nonce)
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
            if (toAssetHash.Length == 0)
            {
                Runtime.Notify("The parameter toAssetHash SHOULD not be empty.");
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

            if (!AssetIsRegistered(fromAssetHash, targetProxyHash, toAssetHash))
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
            bool success = (bool)nep5Contract("transfer", new object[] { fromAddress, currentHash, amount });
            if (!success)
            {
                Runtime.Notify("Failed to transfer NEP5 token to proxy contract.");
                return false;
            }

            var tx = (Transaction)ExecutionEngine.ScriptContainer;
            // construct args for proxy contract on target chain
            var inputArgs = SerializeArgs(fromAssetHash, toAssetHash, toAddress, amount, feeAmount, feeAddress, fromAddress, nonce);
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

            LockEvent(fromAssetHash, fromAddress, CounterpartChainID, toAssetHash, toAddress, amount, inputArgs);

            return true;
        }

#if DEBUG
        [DisplayName("unlock")] //Only for ABI file
        public static bool Unlock(byte[] inputBytes, byte[] fromProxyContract, BigInteger fromChainId) => true;
#endif

        // Methods of actual execution, used to unlock asset from proxy contract
        private static bool Unlock(byte[] inputBytes, byte[] fromProxyContract, BigInteger fromChainId, byte[] caller)
        {
            if (fromChainId != CounterpartChainID)
            {
                Runtime.Notify("Invalid fromChainId");
                return false;
            }

            // only allowed to be called by CCMC
            if (caller.AsBigInteger() != CCMCScriptHash.AsBigInteger())
            {
                Runtime.Notify("Only allowed to be called by CCMC");
                Runtime.Notify(caller);
                Runtime.Notify(CCMCScriptHash);
                return false;
            }

            // parse the args bytes constructed in source chain proxy contract, passed by multi-chain
            object[] results = DeserializeArgs(inputBytes);
            var fromAssetHash = (byte[])results[0];
            var toAssetHash = (byte[])results[1];
            var toAddress = (byte[])results[2];
            var amount = (BigInteger)results[3];

            if (toAssetHash.Length != 20)
            {
                Runtime.Notify("ToChain Asset script hash SHOULD be 20-byte long.");
                return false;
            }

            if (toAddress.Length != 20)
            {
                Runtime.Notify("ToChain Account address SHOULD be 20-byte long.");
                return false;
            }
            if (amount <= 0)
            {
                Runtime.Notify("ToChain Amount SHOULD not be less than 0.");
                return false;
            }

            if (!AssetIsRegistered(toAssetHash, fromProxyContract, fromAssetHash))
            {
                Runtime.Notify("This asset has not yet been registered");
                throw new InvalidOperationException("This asset has not yet been registered"); // allow retrying after registration
            }

            // transfer asset from proxy contract to toAddress
            byte[] currentHash = ExecutionEngine.ExecutingScriptHash; // this proxy contract hash
            var nep5Contract = (DynCall)toAssetHash.ToDelegate();
            bool success = (bool)nep5Contract("transfer", new object[] { currentHash, toAddress, amount });
            if (!success)
            {
                Runtime.Notify("Failed to transfer NEP5 token to toAddress.");
                throw new InvalidOperationException("Failed to transfer NEP5 token to toAddress."); // allow retrying if nep-5 contract has temporary issue
            }

            UnlockEvent(toAssetHash, toAddress, amount, inputBytes);

            return true;
        }

        public static bool AssetIsRegistered(byte[] assetHash, byte[] nativeLockProxy, byte[] nativeAssetHash)
        {
            StorageMap registry = Storage.CurrentContext.CreateMap(nameof(registry));

            var value = nativeLockProxy.Concat(nativeAssetHash);
            var existingValue = registry.Get(assetHash);
            if (existingValue.Length == 0)
            {
                return false;
            }

            return existingValue.AsBigInteger() == value.AsBigInteger();
        }

        public static byte[] GetRegistryValue(byte[] assetHash)
        {
            StorageMap registry = Storage.CurrentContext.CreateMap(nameof(registry));
            return registry.Get(assetHash);
        }

        private static bool MarkAssetAsRegistered(byte[] assetHash, byte[] nativeLockProxy, byte[] nativeAssetHash)
        {
            StorageMap registry = Storage.CurrentContext.CreateMap(nameof(registry));
            if (registry.Get(assetHash).Length != 0)
            {
                return false;
            }

            var value = nativeLockProxy.Concat(nativeAssetHash);
            registry.Put(assetHash, value);
            return true;
        }

        private static object[] ReadUint255(byte[] buffer, int offset)
        {
            if (offset + 32 > buffer.Length)
            {
                Runtime.Notify("Length is not long enough");
                return new object[] { 0, -1 };
            }
            return new object[] { buffer.Range(offset, 32).ToBigInteger(), offset + 32 };
        }

        // return [BigInteger: value, int: offset]
        private static object[] ReadVarInt(byte[] buffer, int offset)
        {
            var res = ReadBytes(buffer, offset, 1); // read the first byte
            var fb = (byte[])res[0];
            if (fb.Length != 1)
            {
                Runtime.Notify("Wrong length");
                return new object[] { 0, -1 };
            }
            var newOffset = (int)res[1];
            if (fb == new byte[] { 0xFD })
            {
                return new object[] { buffer.Range(newOffset, 2).ToBigInteger(), newOffset + 2 };
            }
            else if (fb == new byte[] { 0xFE })
            {
                return new object[] { buffer.Range(newOffset, 4).ToBigInteger(), newOffset + 4 };
            }
            else if (fb == new byte[] { 0xFF })
            {
                return new object[] { buffer.Range(newOffset, 8).ToBigInteger(), newOffset + 8 };
            }
            else
            {
                return new object[] { fb.ToBigInteger(), newOffset };
            }
        }

        // return [byte[], new offset]
        private static object[] ReadVarBytes(byte[] buffer, int offset)
        {
            var res = ReadVarInt(buffer, offset);
            var count = (int)res[0];
            var newOffset = (int)res[1];
            return ReadBytes(buffer, newOffset, count);
        }

        // return [byte[], new offset]
        private static object[] ReadBytes(byte[] buffer, int offset, int count)
        {
            if (offset + count > buffer.Length) throw new ArgumentOutOfRangeException();
            return new object[] { buffer.Range(offset, count), offset + count };
        }

        private static byte[] SerializeArgs(byte[] fromAssetHash, byte[] toAssetHash, byte[] toAddress, BigInteger amount, BigInteger feeAmount, byte[] feeAddress, byte[] fromAddress, BigInteger nonce)
        {
            var buffer = new byte[] { };
            buffer = WriteVarBytes(fromAssetHash, buffer);
            buffer = WriteVarBytes(toAssetHash, buffer);
            buffer = WriteVarBytes(toAddress, buffer);
            buffer = WriteUint255(amount, buffer);
            buffer = WriteUint255(feeAmount, buffer);
            buffer = WriteVarBytes(feeAddress, buffer);
            buffer = WriteVarBytes(fromAddress, buffer);
            buffer = WriteUint255(nonce, buffer);
            return buffer;
        }

        private static object[] DeserializeArgs(byte[] buffer)
        {
            var offset = 0;
            var res = ReadVarBytes(buffer, offset);
            var fromAssetHash = res[0];

            res = ReadVarBytes(buffer, (int)res[1]);
            var toAssetHash = res[0];

            res = ReadVarBytes(buffer, (int)res[1]);
            var toAddress = res[0];

            res = ReadUint255(buffer, (int)res[1]);
            var amount = res[0];

            return new object[] { fromAssetHash, toAssetHash, toAddress, amount };
        }

        private static byte[] SerializeRegisterAssetArgs(byte[] assetHash, byte[] nativeAssetHash)
        {
            var buffer = new byte[] { };
            buffer = WriteVarBytes(assetHash, buffer);
            buffer = WriteVarBytes(nativeAssetHash, buffer);
            return buffer;
        }

        private static object[] DeserializeRegisterAssetArgs(byte[] buffer)
        {
            var offset = 0;
            var res = ReadVarBytes(buffer, offset);
            var assetHash = res[0];

            res = ReadVarBytes(buffer, (int)res[1]);
            var nativeAssetHash = res[0];

            return new object[] { assetHash, nativeAssetHash };
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
