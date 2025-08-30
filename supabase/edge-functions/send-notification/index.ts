import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
console.log("Hello from Functions!");
serve(async (req)=>{
  try {
    const { record, table } = await req.json();
    if (!record || !table) {
      return new Response(JSON.stringify({
        error: "Missing 'record' or 'table' in payload"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    let notificationMessage = "";
    let targetUserIds = [];
    let areaId = null;
    let customerId = null;
    let creatorUserId = null;
    // Determine event type and extract relevant data
    if (table === "customers") {
      const customerName = record.name;
      areaId = record.area_id;
      customerId = record.id;
      creatorUserId = record.user_id;
      notificationMessage = `New customer '${customerName}' added.`;
    } else if (table === "bank_transactions") {
      const amount = record.amount;
      areaId = record.area_id;
      customerId = record.customer_id; // Assuming bank_transactions can be linked to a customer
      creatorUserId = record.user_id; // Assuming bank_transactions has a user_id
      notificationMessage = `New transaction of ${amount} recorded.`;
    } else if (table === "user_expenses") {
      const amount = record.amount;
      const description = record.description;
      areaId = record.area_id;
      creatorUserId = record.user_id;
      notificationMessage = `New expense of ${amount} for '${description}' recorded.`;
    } else {
      return new Response(JSON.stringify({
        error: "Unsupported table type"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    // 1. Fetch Superadmins
    const { data: superadmins, error: superadminError } = await supabase.from("users").select("id").eq("user_type", "superadmin");
    if (superadminError) {
      console.error("Error fetching superadmins:", superadminError);
    } else {
      targetUserIds = targetUserIds.concat(superadmins.map((sa)=>sa.id));
    }
    // 2. Fetch Area Admins (if areaId is available)
    if (areaId) {
      const { data: groupAreas, error: groupAreasError } = await supabase.from("group_areas").select("group_id").eq("area_id", areaId);
      if (groupAreasError) {
        console.error("Error fetching group areas:", groupAreasError);
      } else if (groupAreas.length > 0) {
        const groupIds = groupAreas.map((ga)=>ga.group_id);
        const { data: userGroups, error: userGroupsError } = await supabase.from("user_groups").select("user_id").in("group_id", groupIds);
        if (userGroupsError) {
          console.error("Error fetching user groups:", userGroupsError);
        } else if (userGroups.length > 0) {
          const userIdsInGroups = userGroups.map((ug)=>ug.user_id);
          const { data: areaAdmins, error: areaAdminError } = await supabase.from("users").select("id").in("id", userIdsInGroups).eq("user_type", "admin"); // Assuming 'admin' user_type for area admins
          if (areaAdminError) {
            console.error("Error fetching area admins:", areaAdminError);
          } else {
            targetUserIds = targetUserIds.concat(areaAdmins.map((aa)=>aa.id));
          }
        }
      }
    }
    // 3. Add the creator's user ID to target (if not already included and not a superadmin/admin)
    if (creatorUserId && !targetUserIds.includes(creatorUserId)) {
      const { data: creatorUser, error: creatorUserError } = await supabase.from("users").select("user_type").eq("id", creatorUserId).single();
      if (!creatorUserError && creatorUser && creatorUser.user_type === "user") {
        targetUserIds.push(creatorUserId);
      }
    }
    // 4. Add the customer's user ID to target (if applicable and distinct)
    // This is for the "vice versa to user" part.
    if (table === "customers" && record.user_id && !targetUserIds.includes(record.user_id)) {
      targetUserIds.push(record.user_id);
    } else if (table === "bank_transactions" && customerId) {
      const { data: customerData, error: customerDataError } = await supabase.from("customers").select("user_id").eq("id", customerId).single();
      if (!customerDataError && customerData && customerData.user_id && !targetUserIds.includes(customerData.user_id)) {
        targetUserIds.push(customerData.user_id);
      }
    }
    // Ensure unique target user IDs
    targetUserIds = [
      ...new Set(targetUserIds)
    ];
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({
        message: "No target users for notification"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // Fetch push tokens for target users
    const { data: pushTokens, error: pushTokensError } = await supabase.from("user_push_tokens").select("push_token").in("user_id", targetUserIds);
    if (pushTokensError) {
      console.error("Error fetching push tokens:", pushTokensError);
      return new Response(JSON.stringify({
        error: "Failed to fetch push tokens"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 500
      });
    }
    const expoPushTokens = pushTokens.map((pt)=>pt.push_token);
    if (expoPushTokens.length === 0) {
      return new Response(JSON.stringify({
        message: "No Expo push tokens found for target users"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // Send FCM Push Notifications
    const notificationUrl = "https://fcm.googleapis.com/fcm/send";
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY") || "YOUR_FCM_SERVER_KEY_HERE"; // IMPORTANT: Replace with your actual FCM Server Key or set as Deno env var

    if (!fcmServerKey || fcmServerKey === "YOUR_FCM_SERVER_KEY_HERE") {
      console.error("FCM_SERVER_KEY is not set. Cannot send notifications.");
      return new Response(JSON.stringify({
        error: "FCM Server Key not configured."
      }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    const results = [];
    for (const token of expoPushTokens) { // expoPushTokens now contains raw FCM tokens
      const fcmMessage = {
        to: token,
        notification: {
          title: "New Activity Alert",
          body: notificationMessage,
        },
        data: {
          table: table,
          recordId: record.id,
          areaId: areaId,
          customerId: customerId,
        },
      };

      console.log("Calling FCM URL:", notificationUrl, "for token:", token);
      const fcmResponse = await fetch(notificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${fcmServerKey}`,
        },
        body: JSON.stringify(fcmMessage),
      });
      const fcmResult = await fcmResponse.json();
      results.push({ token, result: fcmResult });
      console.log("FCM Send Result for token", token, ":", fcmResult);
    }

    return new Response(JSON.stringify({
      message: "Notifications sent via FCM",
      fcmResults: results,
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
