import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sendNotifications = async (supabaseClient, newTransaction, reqHeaders)=>{
  try {
    console.log("newTransaction.area_id:", newTransaction.area_id); // for debugging
    const { data: areaData, error: areaError } = await supabaseClient.from("group_areas").select("group_id").eq("area_id", newTransaction.area_id);
    if (areaError) {
      console.error("Error fetching group_areas:", areaError);
      return;
    }
    const groupIds = areaData.map((area)=>area.group_id);
    const { data: userData, error: userError } = await supabaseClient.from("user_groups").select("user_id").in("group_id", groupIds);
    if (userError) {
      console.error("Error fetching user_groups:", userError);
      return;
    }
    const userIds = userData.map((user)=>user.user_id);
    const { data: tokenData, error: tokenError } = await supabaseClient.from("user_push_tokens").select("push_token").in("user_id", userIds);
    if (tokenError) {
      console.error("Error fetching user_push_tokens:", tokenError);
      return;
    }
    const pushTokens = tokenData.map((token)=>token.push_token);
    const messages = [];
    for (const pushToken of pushTokens){
      if (!pushToken.startsWith("ExponentPushToken[") || !pushToken.endsWith("]")) {
        console.warn(`Push token ${pushToken} is not a valid Expo push token format. Skipping.`);
        continue;
      }
      messages.push({
        to: pushToken,
        sound: "default",
        title: "New Transaction",
        body: `A new transaction of ${newTransaction.amount} has been added in area ${newTransaction.area_id}`,
        data: {
          transactionId: newTransaction.id
        }
      });
    }
    if (messages.length === 0) {
      console.log("No valid push tokens found to send notifications.");
      return;
    }
    console.log(`Sending ${messages.length} push notifications.`);
    const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    if (!expoAccessToken) {
      console.error("EXPO_ACCESS_TOKEN environment variable is not set.");
      return;
    }
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
        Authorization: `Bearer ${expoAccessToken}`
      },
      body: JSON.stringify(messages)
    });
    const result = await response.json();
    console.log("Expo Push API response:", JSON.stringify(result, null, 2));
    if (response.status !== 200) {
      console.error("Error from Expo Push API:", result);
    }
  } catch (err) {
    console.error("Error in sendNotifications:", err);
  }
};
serve(async (req)=>{
  try {
    console.log("Edge Function received request.");
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization")
        }
      }
    });
    const { record: newTransaction } = requestBody;
    console.log("Parsed newTransaction:", JSON.stringify(newTransaction, null, 2));
    if (!newTransaction) {
      console.error("No newTransaction record found in payload.");
      return new Response(JSON.stringify({
        error: "No newTransaction record found in payload."
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    // Do not await this
    sendNotifications(supabaseClient, newTransaction, req.headers);
    return new Response(JSON.stringify({
      message: "Notification process started."
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 202
    });
  } catch (err) {
    console.error("Unhandled error in Edge Function:", err);
    return new Response(String(err?.message ?? err), {
      status: 500
    });
  }
});
