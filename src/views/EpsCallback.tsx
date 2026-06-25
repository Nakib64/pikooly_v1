import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import SEOHead from "@/components/seo/SEOHead";

const EpsCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<"success" | "fail" | "cancel" | null>(null);

  const status = searchParams.get("status");
  const orderNumber = searchParams.get("order");
  const txn = searchParams.get("txn");
  const type = searchParams.get("type"); // "wallet" for wallet topup
  const wtxn = searchParams.get("wtxn"); // wallet transaction id

  const isWallet = type === "wallet";

  useEffect(() => {
    const verify = async () => {
      if (status === "cancel") {
        // If wallet topup was cancelled, mark transaction as failed
        if (isWallet && wtxn) {
          await supabase
            .from("wallet_transactions")
            .update({ status: "failed" })
            .eq("id", wtxn);
        }
        setResult("cancel");
        setVerifying(false);
        return;
      }

      if (status === "success" && txn) {
        try {
          const { data, error } = await supabase.functions.invoke("eps-payment", {
            body: { action: "verify", merchantTransactionId: txn },
          });

          if (!error && data?.Status === "Success") {
            if (!isWallet) {
              clearCart();
            }
            setResult("success");
          } else {
            // Mark wallet transaction as failed
            if (isWallet && wtxn) {
              await supabase
                .from("wallet_transactions")
                .update({ status: "failed" })
                .eq("id", wtxn);
            }
            setResult("fail");
          }
        } catch {
          setResult("fail");
        }
      } else {
        if (isWallet && wtxn) {
          await supabase
            .from("wallet_transactions")
            .update({ status: "failed" })
            .eq("id", wtxn);
        }
        setResult("fail");
      }
      setVerifying(false);
    };

    verify();
  }, [status, txn]);

  if (verifying) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin mx-auto text-primary" size={48} />
          <p className="text-lg font-medium">Verifying your payment...</p>
          <p className="text-sm text-muted-foreground">Please wait, do not close this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center pb-24">
      <SEOHead title="Payment Verification — Pikooly" description="Verifying your payment status. Please wait." noindex />
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        {result === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              {isWallet ? (
                <Wallet size={40} className="text-green-600" />
              ) : (
                <CheckCircle size={40} className="text-green-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {isWallet ? "Wallet Top-up Successful!" : "Payment Successful!"}
            </h1>
            <p className="text-muted-foreground">
              {isWallet
                ? "Your wallet has been topped up successfully. The balance is now available in your account."
                : <>Your payment has been confirmed via EPS. Order: <strong>{orderNumber}</strong></>
              }
            </p>
            <Button
              onClick={() => navigate(isWallet ? "/account" : `/order-success/${orderNumber}`)}
              className="rounded-full"
            >
              {isWallet ? "Back to Account" : "View Order Details"}
            </Button>
          </>
        )}

        {result === "fail" && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle size={40} className="text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">
              {isWallet ? "Top-up Failed" : "Payment Failed"}
            </h1>
            <p className="text-muted-foreground">
              {isWallet
                ? "Your wallet top-up could not be processed. Please try again."
                : "Your payment could not be processed. Please try again or choose a different payment method."
              }
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate(isWallet ? "/account" : "/checkout")}
                className="rounded-full"
              >
                {isWallet ? "Back to Account" : "Back to Checkout"}
              </Button>
              {!isWallet && (
                <Button onClick={() => navigate("/")} className="rounded-full">
                  Continue Shopping
                </Button>
              )}
            </div>
          </>
        )}

        {result === "cancel" && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">
              {isWallet ? "Top-up Cancelled" : "Payment Cancelled"}
            </h1>
            <p className="text-muted-foreground">
              {isWallet
                ? "You cancelled the wallet top-up. No amount was charged."
                : "You cancelled the payment. Your order has not been charged."
              }
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate(isWallet ? "/account" : "/checkout")}
                className="rounded-full"
              >
                {isWallet ? "Back to Account" : "Back to Checkout"}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default EpsCallback;
