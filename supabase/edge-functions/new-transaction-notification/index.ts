import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Expo } from 'npm:expo-server-sdk'

const expo = new Expo();

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { record: newTransaction } = await req.json()

    const { data: areaData, error: areaError } = await supabaseClient
      .from('group_areas')
      .select('group_id')
      .eq('area_id', newTransaction.area_id)

    if (areaError) {
      console.error('Error fetching group_areas:', areaError)
      return new Response(JSON.stringify({ error: areaError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const groupIds = areaData.map((area) => area.group_id)

    const { data: userData, error: userError } = await supabaseClient
      .from('user_groups')
      .select('user_id')
      .in('group_id', groupIds)

    if (userError) {
      console.error('Error fetching user_groups:', userError)
      return new Response(JSON.stringify({ error: userError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const userIds = userData.map((user) => user.user_id)

    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_push_tokens')
      .select('push_token')
      .in('user_id', userIds)

    if (tokenError) {
      console.error('Error fetching user_push_tokens:', tokenError)
      return new Response(JSON.stringify({ error: tokenError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const pushTokens = tokenData.map((token) => token.push_token)

    const messages = []
    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`Push token ${pushToken} is not a valid Expo push token`)
        continue
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title: 'New Transaction',
        body: `A new transaction of ${newTransaction.amount} has been added in area ${newTransaction.area_id}`,
        data: { transactionId: newTransaction.id },
      })
    }

    const chunks = expo.chunkPushNotifications(messages)
    const tickets = []
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        tickets.push(...ticketChunk)
      } catch (error) {
        console.error('Error sending push notifications:', error)
      }
    }

    return new Response(JSON.stringify({ tickets }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})
