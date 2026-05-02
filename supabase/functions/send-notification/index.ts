// index.ts - Supabase Edge Function for Push Notifications (FCM v1 API)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { create } from "https://deno.land/x/djwt@v2.9/mod.ts";

console.log("Notification Function Booted!");

// 🔑 Helper: Generate OAuth2 Access Token for FCM v1
async function getAccessToken() {
  const privateKey = (Deno.env.get("FCM_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
  const clientEmail = Deno.env.get("FCM_CLIENT_EMAIL") ?? "";
  const projectId = Deno.env.get("FCM_PROJECT_ID") ?? "";

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error("FCM service account credentials are missing");
  }

  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const jwtClaims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600, // 1 hour expiration
  };

  const jwt = await create(jwtHeader, jwtClaims, privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to obtain FCM access token: " + JSON.stringify(data));
  }
  return { accessToken: data.access_token, projectId };
}

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Incoming payload:", payload);

    const record = payload.record ?? null;
    const table = payload.table ?? null;

    // ✅ Use Service Role Key (anon may fail under RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let notificationMessage = "";
    let targetUserIds: string[] = [];
    let areaId: string | null = null;
    let areaName: string | null = null;
    let customerId: string | null = null;
    let creatorUserId: string | null = null;
    let creatorUserName: string | null = null;

    // 🚦 Identify table + base message
    if (record && table) {
      if (table === "customers") {
        areaId = record.area_id;
        customerId = record.id;
        creatorUserId = record.user_id;
        notificationMessage = `New customer '${record.name}' added (Card No: ${record.book_no})`;
      } else if (table === "bank_transactions") {
        areaId = record.area_id;
        customerId = record.customer_id;
        creatorUserId = record.user_id;
        notificationMessage = `New bank transaction type '${record.transaction_type}' of ${record.amount} recorded`;
      } else if (table === "transactions") {
        areaId = record.area_id;
        customerId = record.customer_id;
        creatorUserId = record.user_id;
        notificationMessage = `New transaction of ${record.amount} recorded`;
      } else if (table === "user_expenses") {
        areaId = record.area_id;
        creatorUserId = record.user_id;
        notificationMessage = `New expense of ${record.amount} for '${record.description}' recorded`;
      } else {
        notificationMessage = `New record added in ${table}`;
      }
    } else {
      notificationMessage = "New record added";
    }

    // 🔍 Fetch area name
    if (areaId) {
      const { data: areaData } = await supabase
        .from("area_master")
        .select("area_name")
        .eq("id", areaId)
        .single();
      if (areaData?.area_name) {
        areaName = areaData.area_name;
        notificationMessage = `${notificationMessage} in area '${areaName}'`;
      }
    }

    // 👤 Fetch creator user name
    if (creatorUserId) {
      const { data: creatorData } = await supabase
        .from("users")
        .select("name, user_type")
        .eq("id", creatorUserId)
        .single();
      if (creatorData?.name) {
        creatorUserName = creatorData.name;
        notificationMessage = `${notificationMessage} by '${creatorUserName}'`;
      }
    }

    // 👤 Superadmins
    const { data: superadmins } = await supabase
      .from("users")
      .select("id")
      .eq("user_type", "superadmin");
    if (superadmins) {
      targetUserIds.push(...superadmins.map((sa) => sa.id));
    }

    // 🏢 Area Admins
    if (areaId) {
      const { data: groupAreas } = await supabase
        .from("group_areas")
        .select("group_id")
        .eq("area_id", areaId);
      if (groupAreas?.length > 0) {
        const groupIds = groupAreas.map((ga) => ga.group_id);
        const { data: userGroups } = await supabase
          .from("user_groups")
          .select("user_id")
          .in("group_id", groupIds);
        if (userGroups?.length > 0) {
          const userIdsInGroups = userGroups.map((ug) => ug.user_id);
          const { data: areaAdmins } = await supabase
            .from("users")
            .select("id")
            .in("id", userIdsInGroups)
            .eq("user_type", "admin");
          if (areaAdmins) {
            targetUserIds.push(...areaAdmins.map((aa) => aa.id));
          }
        }
      }
    }

    // 👤 Add creator if normal user
    if (creatorUserId && !targetUserIds.includes(creatorUserId)) {
      const { data: creatorUser } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", creatorUserId)
        .single();
      if (creatorUser && creatorUser.user_type === "user") {
        targetUserIds.push(creatorUserId);
      }
    }

    // 🔄 Add customer’s linked user
    if ((table === "transactions" || table === "bank_transactions") && customerId) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("user_id")
        .eq("id", customerId)
        .single();
      if (customerData?.user_id && !targetUserIds.includes(customerData.user_id)) {
        targetUserIds.push(customerData.user_id);
      }
    } else if (table === "customers" && record.user_id) {
      if (!targetUserIds.includes(record.user_id)) {
        targetUserIds.push(record.user_id);
      }
    }

    // 🧹 Deduplicate
    targetUserIds = [...new Set(targetUserIds)];
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ message: "No target users" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 🔑 Fetch push tokens
    const { data: pushTokens, error: pushTokensError } = await supabase
      .from("user_push_tokens")
      .select("push_token")
      .in("user_id", targetUserIds);
    if (pushTokensError) {
      console.error("Error fetching push tokens:", pushTokensError);
      return new Response(JSON.stringify({ error: "Failed to fetch push tokens" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }
    const fcmTokens = pushTokens?.map((pt) => pt.push_token) ?? [];
    if (fcmTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No push tokens found" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 📲 Send via FCM v1
    const { accessToken, projectId } = await getAccessToken();
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const results: any[] = [];
    for (const token of fcmTokens) {
      const fcmMessage = {
        message: {
          token,
          notification: {
            title: "New Activity Alert",
            body: notificationMessage,
          },
          data: {
            table,
            recordId: record?.id ?? null,
            areaId,
            areaName,
            customerId,
            creatorUserName,
          },
        },
      };

      const fcmResponse = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(fcmMessage),
      });
      const fcmResult = await fcmResponse.json();
      results.push({ token, result: fcmResult });
      console.log("FCM v1 result:", fcmResult);
    }

    return new Response(
      JSON.stringify({ message: "Notifications sent via FCM v1", results }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});