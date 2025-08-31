// Edge Function: archive-customer
// Archives a customer and its transactions into the *_completed history tables
// and then removes the originals.

import { createClient } from "npm:@supabase/supabase-js@2";

// Deno built‑in server – no external server library needed
Deno.serve(async (req: Request) => {
  // Only POST is allowed
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { customer_id }: { customer_id: string } = await req.json();
    if (!customer_id) {
      return new Response(JSON.stringify({ error: "Missing customer_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialise Supabase client with service role – safe because this runs in a trusted Edge Function
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1️⃣ Fetch the customer record
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customer_id)
      .single();
    if (customerError || !customer) {
      console.error("Customer fetch error:", customerError?.message);
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2️⃣ Fetch all transactions linked to that customer
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("customer_id", customer_id);
    if (txError) {
      console.error("Transaction fetch error:", txError.message);
      return new Response(JSON.stringify({ error: "Failed to load transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3️⃣ Insert the customer into the archive table
    const { error: insertCustError } = await supabase
      .from("customer_cycles_completed")
      .insert({
        ...customer,
        archived_at: new Date().toISOString(),
      });
    if (insertCustError) {
      console.error("Archive customer insert error:", insertCustError.message);
      return new Response(JSON.stringify({ error: "Failed to archive customer" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4️⃣ Archive transactions (if any)
    if (transactions && transactions.length > 0) {
      const txToArchive = transactions.map((tx) => ({
        ...tx,
        archived_at: new Date().toISOString(),
      }));
      const { error: insertTxError } = await supabase
        .from("transaction_cycles_completed")
        .insert(txToArchive);
      if (insertTxError) {
        console.error("Archive transactions error:", insertTxError.message);
        return new Response(JSON.stringify({ error: "Failed to archive transactions" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 5️⃣ Delete original transactions
    const { error: deleteTxError } = await supabase
      .from("transactions")
      .delete()
      .eq("customer_id", customer_id);
    if (deleteTxError) {
      console.error("Delete original transactions error:", deleteTxError.message);
      return new Response(JSON.stringify({ error: "Failed to delete original transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 6️⃣ Delete the original customer record
    const { error: deleteCustError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer_id);
    if (deleteCustError) {
      console.error("Delete original customer error:", deleteCustError.message);
      return new Response(JSON.stringify({ error: "Failed to delete original customer" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success response
    return new Response(JSON.stringify({ message: "Customer archived successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected Edge Function error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});