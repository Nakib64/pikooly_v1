import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HMAC-SHA512 hash generation
async function generateHash(data: string, hashKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(hashKey);
  const msgData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // Fetch EPS settings from site_settings
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "eps_username",
        "eps_password",
        "eps_store_id",
        "eps_hash_key",
        "eps_mode",
        "eps_status",
      ]);

    if (settingsError) throw new Error("Failed to fetch EPS settings");

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: any) => {
      settings[s.key] = s.value || "";
    });

    if (settings.eps_status !== "enable") {
      return new Response(
        JSON.stringify({ error: "EPS Payment Gateway is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl =
      settings.eps_mode === "live"
        ? "https://pgapi.eps.com.bd"
        : "https://sandboxpgapi.eps.com.bd";

    // ============ ORDER PAYMENT ============
    if (action === "initialize") {
      const { order_id } = body;

      // Step 1: Get Token
      const usernameHash = await generateHash(
        settings.eps_username,
        settings.eps_hash_key
      );

      const tokenRes = await fetch(`${baseUrl}/v1/Auth/GetToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hash": usernameHash,
        },
        body: JSON.stringify({
          userName: settings.eps_username,
          password: settings.eps_password,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.token) {
        console.error("EPS GetToken failed:", tokenData);
        return new Response(
          JSON.stringify({
            error: "EPS authentication failed",
            details: tokenData.errorMessage || "Could not get token",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 2: Get order details
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get order items
      const { data: orderItems } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", order_id);

      // Generate unique merchant transaction ID
      const merchantTransactionId = `${Date.now()}${Math.floor(
        Math.random() * 10000
      )}`;

      // Store merchantTransactionId in order notes for later verification
      await supabaseAdmin
        .from("orders")
        .update({
          notes: JSON.stringify({
            eps_merchant_transaction_id: merchantTransactionId,
            original_notes: order.notes,
          }),
        })
        .eq("id", order_id);

      // Build callback URLs  
      const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
      const successUrl = `${siteUrl}/eps-callback?status=success&order=${order.order_number}&txn=${merchantTransactionId}`;
      const failUrl = `${siteUrl}/eps-callback?status=fail&order=${order.order_number}&txn=${merchantTransactionId}`;
      const cancelUrl = `${siteUrl}/eps-callback?status=cancel&order=${order.order_number}&txn=${merchantTransactionId}`;

      // Generate hash for transaction
      const txnHash = await generateHash(
        merchantTransactionId,
        settings.eps_hash_key
      );

      // Product list for EPS
      const productList = (orderItems || []).map((item: any) => ({
        ProductName: item.product_name,
        NoOfItem: String(item.quantity),
        ProductProfile: "general",
        ProductCategory: "gift",
        ProductPrice: String(item.price),
      }));

      const initPayload = {
        storeId: settings.eps_store_id,
        merchantTransactionId: merchantTransactionId,
        CustomerOrderId: order.order_number,
        transactionTypeId: 1,
        financialEntityId: 0,
        transitionStatusId: 0,
        totalAmount: Number(order.is_preorder ? (order.advance_amount || order.total) : order.total),
        ipAddress: "0.0.0.0",
        version: "1",
        successUrl,
        failUrl,
        cancelUrl,
        customerName: order.customer_name || "Customer",
        customerEmail: order.customer_email || "customer@example.com",
        customerAddress: order.delivery_address || "N/A",
        customerAddress2: "",
        customerCity: "Dhaka",
        customerState: "Dhaka",
        customerPostcode: "1000",
        customerCountry: "BD",
        customerPhone: order.customer_phone || "01700000000",
        shipmentName: order.recipient_name || order.customer_name || "Recipient",
        shipmentAddress: order.delivery_address || "N/A",
        shipmentAddress2: "",
        shipmentCity: "Dhaka",
        shipmentState: "Dhaka",
        shipmentPostcode: "1000",
        shipmentCountry: "BD",
        valueA: order_id,
        valueB: order.order_number,
        valueC: "",
        valueD: "",
        shippingMethod: "courier",
        noOfItem: String((orderItems || []).length),
        productName: (orderItems || []).map((i: any) => i.product_name).join(", "),
        productProfile: "general",
        productCategory: "gift",
        ProductList: productList,
      };

      const initRes = await fetch(`${baseUrl}/v1/EPSEngine/InitializeEPS`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hash": txnHash,
          Authorization: `Bearer ${tokenData.token}`,
        },
        body: JSON.stringify(initPayload),
      });

      const initData = await initRes.json();

      if (!initData.RedirectURL) {
        console.error("EPS Initialize failed:", initData);
        return new Response(
          JSON.stringify({
            error: "EPS payment initialization failed",
            details: initData.ErrorMessage || "No redirect URL received",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          redirectUrl: initData.RedirectURL,
          transactionId: initData.TransactionId,
          merchantTransactionId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ WALLET TOP-UP ============
    if (action === "wallet_topup") {
      const { user_id, amount, transaction_id } = body;

      if (!user_id || !amount || !transaction_id) {
        return new Response(
          JSON.stringify({ error: "user_id, amount, and transaction_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 1: Get Token
      const usernameHash = await generateHash(
        settings.eps_username,
        settings.eps_hash_key
      );

      const tokenRes = await fetch(`${baseUrl}/v1/Auth/GetToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hash": usernameHash,
        },
        body: JSON.stringify({
          userName: settings.eps_username,
          password: settings.eps_password,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.token) {
        return new Response(
          JSON.stringify({ error: "EPS authentication failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const merchantTransactionId = `WT-${Date.now()}${Math.floor(Math.random() * 10000)}`;

      // Store reference in wallet_transactions
      await supabaseAdmin
        .from("wallet_transactions")
        .update({ reference_id: merchantTransactionId })
        .eq("id", transaction_id);

      const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
      const successUrl = `${siteUrl}/eps-callback?status=success&type=wallet&txn=${merchantTransactionId}&wtxn=${transaction_id}`;
      const failUrl = `${siteUrl}/eps-callback?status=fail&type=wallet&txn=${merchantTransactionId}&wtxn=${transaction_id}`;
      const cancelUrl = `${siteUrl}/eps-callback?status=cancel&type=wallet&txn=${merchantTransactionId}&wtxn=${transaction_id}`;

      const txnHash = await generateHash(
        merchantTransactionId,
        settings.eps_hash_key
      );

      const initPayload = {
        storeId: settings.eps_store_id,
        merchantTransactionId,
        CustomerOrderId: `WALLET-${transaction_id.slice(0, 8)}`,
        transactionTypeId: 1,
        financialEntityId: 0,
        transitionStatusId: 0,
        totalAmount: Number(amount),
        ipAddress: "0.0.0.0",
        version: "1",
        successUrl,
        failUrl,
        cancelUrl,
        customerName: "Customer",
        customerEmail: "customer@example.com",
        customerAddress: "N/A",
        customerAddress2: "",
        customerCity: "Dhaka",
        customerState: "Dhaka",
        customerPostcode: "1000",
        customerCountry: "BD",
        customerPhone: "01700000000",
        shipmentName: "Wallet Top-up",
        shipmentAddress: "N/A",
        shipmentAddress2: "",
        shipmentCity: "Dhaka",
        shipmentState: "Dhaka",
        shipmentPostcode: "1000",
        shipmentCountry: "BD",
        valueA: transaction_id,
        valueB: user_id,
        valueC: "wallet_topup",
        valueD: String(amount),
        shippingMethod: "N/A",
        noOfItem: "1",
        productName: "Wallet Top-up",
        productProfile: "general",
        productCategory: "topup",
        ProductList: [{
          ProductName: "Wallet Top-up",
          NoOfItem: "1",
          ProductProfile: "general",
          ProductCategory: "topup",
          ProductPrice: String(amount),
        }],
      };

      const initRes = await fetch(`${baseUrl}/v1/EPSEngine/InitializeEPS`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hash": txnHash,
          Authorization: `Bearer ${tokenData.token}`,
        },
        body: JSON.stringify(initPayload),
      });

      const initData = await initRes.json();

      if (!initData.RedirectURL) {
        console.error("EPS Wallet Init failed:", initData);
        return new Response(
          JSON.stringify({
            error: "EPS payment initialization failed",
            details: initData.ErrorMessage || "No redirect URL received",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          redirectUrl: initData.RedirectURL,
          transactionId: initData.TransactionId,
          merchantTransactionId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ VERIFY ============
    if (action === "verify") {
      const { merchantTransactionId } = body;

      if (!merchantTransactionId) {
        return new Response(
          JSON.stringify({ error: "merchantTransactionId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get token first
      const usernameHash = await generateHash(
        settings.eps_username,
        settings.eps_hash_key
      );

      const tokenRes = await fetch(`${baseUrl}/v1/Auth/GetToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hash": usernameHash,
        },
        body: JSON.stringify({
          userName: settings.eps_username,
          password: settings.eps_password,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.token) {
        return new Response(
          JSON.stringify({ error: "EPS auth failed for verification" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const txnHash = await generateHash(
        merchantTransactionId,
        settings.eps_hash_key
      );

      const verifyRes = await fetch(
        `${baseUrl}/v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${merchantTransactionId}`,
        {
          method: "GET",
          headers: {
            "x-hash": txnHash,
            Authorization: `Bearer ${tokenData.token}`,
          },
        }
      );

      const verifyData = await verifyRes.json();

      // Check if this is a wallet top-up verification
      if (verifyData.Status === "Success" && verifyData.ValueC === "wallet_topup") {
        const walletTxnId = verifyData.ValueA;
        const walletUserId = verifyData.ValueB;
        const topupAmount = parseFloat(verifyData.ValueD || "0");

        if (walletTxnId && walletUserId && topupAmount > 0) {
          // Update wallet balance
          const { data: existingWallet } = await supabaseAdmin
            .from("wallets")
            .select("*")
            .eq("user_id", walletUserId)
            .maybeSingle();

          const newBalance = (existingWallet?.balance || 0) + topupAmount;

          if (existingWallet) {
            await supabaseAdmin
              .from("wallets")
              .update({ balance: newBalance })
              .eq("user_id", walletUserId);
          } else {
            await supabaseAdmin
              .from("wallets")
              .insert({ user_id: walletUserId, balance: newBalance });
          }

          // Update transaction status
          await supabaseAdmin
            .from("wallet_transactions")
            .update({
              status: "completed",
              balance_after: newBalance,
            })
            .eq("id", walletTxnId);
        }

        return new Response(
          JSON.stringify({ ...verifyData, wallet_updated: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Regular order payment verification
      if (verifyData.Status === "Success") {
        const orderId = verifyData.ValueA;
        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "paid",
              status: "confirmed",
            })
            .eq("id", orderId);

          // Sync to Google Sheets (fire-and-forget)
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets-sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ order_id: orderId }),
            });
          } catch (e) {
            console.error("Google Sheets sync failed:", e);
          }
        }
      }

      return new Response(JSON.stringify(verifyData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'initialize', 'wallet_topup', or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("EPS Payment Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
