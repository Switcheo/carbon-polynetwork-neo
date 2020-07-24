using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services.Neo;
using Neo.SmartContract.Framework.Services.System;
using System;
using System.ComponentModel;
using System.Numerics;

namespace Neo.SmartContract
{
    public class Switcheo_Token : Framework.SmartContract
    {
        // Events
        [DisplayName("transfer")]
        public static event Action<byte[], byte[], BigInteger> Transferred;

        [DisplayName("refund")]
        public static event Action<byte[], BigInteger> Refund;

        // Token Settings
        public static string Name() => "Switcheo";
        public static string Symbol() => "SWTH";
        public static byte Decimals() => 8;
        private const ulong factor = 100000000; // decided by Decimals()
        public static readonly byte[] Owner = "AK5JtqW3NbdmuxNDjHPo7KuShjjXKz6u6U".ToScriptHash();

        // ICO settings
        private const ulong amount = 1_000_000_000 * factor;

        public static Object Main(string operation, params object[] args)
        {
            if (Runtime.Trigger == TriggerType.Verification)
            {
                return Runtime.CheckWitness(Owner);
            }
            else if (Runtime.Trigger == TriggerType.Application)
            {
                if (operation == "totalSupply") return TotalSupply();
                if (operation == "name") return Name();
                if (operation == "symbol") return Symbol();
                if (operation == "decimals") return Decimals();
                if (operation == "deploy") return Deploy();
                if (operation == "balanceOf")
                {
                    if (args.Length != 1) return 0;
                    byte[] account = (byte[])args[0];
                    return BalanceOf(account);
                }
                if (operation == "transfer")
                {
                    if (args.Length != 3) return false;
                    return Transfer((byte[])args[0], (byte[])args[1], (BigInteger)args[2]);
                }
            }
            return false;
        }

        public static bool Deploy()
        {
            if (Storage.Get(Storage.CurrentContext, "totalSupply").Length != 0) return false;
            Storage.Put(Storage.CurrentContext, Owner, amount);
            Storage.Put(Storage.CurrentContext, "totalSupply", amount);
            Transferred(null, Owner, amount);
            return true;
        }

        public static BigInteger TotalSupply()
        {
            return Storage.Get(Storage.CurrentContext, "totalSupply").AsBigInteger();
        }

        public static BigInteger BalanceOf(byte[] address)
        {
            return Storage.Get(Storage.CurrentContext, address).AsBigInteger();
        }

        public static bool Transfer(byte[] from, byte[] to, BigInteger amount)
        {
            if (amount <= 0) return false;
            if (!Runtime.CheckWitness(from)) return false;
            if (from == to) return true;

            BigInteger balance = Storage.Get(Storage.CurrentContext, from).AsBigInteger();
            if (balance < amount) return false;

            if (balance == amount) Storage.Delete(Storage.CurrentContext, from);
            else Storage.Put(Storage.CurrentContext, from, balance - amount);

            BigInteger receiverBalance = Storage.Get(Storage.CurrentContext, to).AsBigInteger();
            Storage.Put(Storage.CurrentContext, to, receiverBalance + amount);
            Transferred(from, to, amount);
            return true;
        }
    }
}
