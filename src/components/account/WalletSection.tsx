import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useMultiCurrency } from "@/contexts/CurrencyContext";

interface WalletSectionProps {
  userId: string;
}

const TOPUP_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const WalletSection = ({ userId }: WalletSectionProps) => {
  const queryClient = useQueryClient();
  const { formatPrice, selectedCurrency } = useMultiCurrency();
  const symbol = selectedCurrency?.symbol || "৳";
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleTopup = async () => {
    const topupAmount = parseFloat(amount);
    if (!topupAmount || topupAmount < 10) {
      toast.error(`Minimum top-up amount is ${formatPrice(10)}`);
      return;
    }
    if (topupAmount > 50000) {
      toast.error(`Maximum top-up amount is ${formatPrice(50000)}`);
      return;
    }

    setLoading(true);
    try {
      // Ensure wallet exists
      if (!wallet) {
        await supabase.from("wallets").insert({ user_id: userId, balance: 0 });
      }

      // Create pending transaction
      const { data: txn, error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          type: "topup",
          amount: topupAmount,
          balance_after: (wallet?.balance || 0) + topupAmount,
          description: `Wallet top-up via EPS`,
          status: "pending",
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Call EPS for wallet topup
      const { data, error } = await supabase.functions.invoke("eps-payment", {
        body: {
          action: "wallet_topup",
          user_id: userId,
          amount: topupAmount,
          transaction_id: txn.id,
        },
      });

      if (error || data?.error) {
        // Mark transaction as failed
        await supabase
          .from("wallet_transactions")
          .update({ status: "failed" })
          .eq("id", txn.id);
        throw new Error(data?.error || error?.message || "Payment failed");
      }

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", userId] });
    } finally {
      setLoading(false);
    }
  };

  const balance = wallet?.balance || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      {/* Header & Balance */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
          <Wallet size={18} className="text-primary" />
          My Wallet
        </h2>
        <button
          onClick={() => setShowTopup(!showTopup)}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {showTopup ? <X size={14} /> : <Plus size={14} />}
          {showTopup ? "Cancel" : "Add Fund"}
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-xl p-4 sm:p-5 mb-4 border border-primary/20">
        <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
        <p className="text-2xl sm:text-3xl font-bold text-foreground font-display">
          {formatPrice(balance)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Use wallet balance during checkout
        </p>
      </div>

      {/* Top-up Form */}
      {showTopup && (
        <div className="mb-4 p-3 sm:p-4 bg-muted/50 rounded-xl space-y-3 border border-border/50">
          <p className="text-sm font-medium text-foreground">Select or enter amount</p>
          
          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2">
            {TOPUP_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  amount === String(a)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:border-primary/50"
                }`}
              >
                {formatPrice(a)}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
            <input
              type="number"
              placeholder="Custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={10}
              max={50000}
              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm"
            />
          </div>

          <button
            onClick={handleTopup}
            disabled={loading || !amount}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {loading ? "Processing..." : `Add ${amount ? formatPrice(parseFloat(amount) || 0) : "Fund"}`}
          </button>
          
          <p className="text-[10px] text-muted-foreground text-center">
            Payment via EPS • Min {formatPrice(10)} • Max {formatPrice(50000)}
          </p>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Transactions</p>
          {transactions.map((txn: any) => (
            <div
              key={txn.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-border transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                txn.type === "topup" ? "bg-green-500/10" : txn.type === "refund" ? "bg-blue-500/10" : "bg-amber-500/10"
              }`}>
                {txn.type === "topup" ? (
                  <ArrowDownLeft size={14} className="text-green-600" />
                ) : txn.type === "spent" ? (
                  <ArrowUpRight size={14} className="text-amber-600" />
                ) : (
                  <ArrowDownLeft size={14} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground capitalize">{txn.type}</p>
                  <p className={`text-sm font-semibold ${
                    txn.type === "spent" ? "text-amber-600" : "text-green-600"
                  }`}>
                    {txn.type === "spent" ? "-" : "+"}{formatPrice(txn.amount)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground truncate pr-2">
                    {txn.description || "Wallet transaction"}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      txn.status === "completed" ? "bg-green-500/10 text-green-600" :
                      txn.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {txn.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock size={9} />
                      {new Date(txn.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
      )}
    </div>
  );
};

export default WalletSection;
