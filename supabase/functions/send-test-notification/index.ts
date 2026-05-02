import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { Expo } from 'npm:expo-server-sdk'

const expo = new Expo({ accessToken: Deno.env.get("EXPO_ACCESS_TOKEN") });

serve(async (req) => {
  try {
    const { push_token, title, message } = await req.json()

    if (!Expo.isExpoPushToken(push_token)) {
      return new Response(JSON.stringify({ error: `Push token ${push_token} is not a valid Expo push token` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const messages = [{
      to: push_token,
      sound: 'default',
      title: title || 'Test Notification',
      body: message || 'This is a test notification from the app.',
      data: { withSome: 'data' },
    }]

    const chunks = expo.chunkPushNotifications(messages)
    const tickets = []
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        tickets.push(...ticketChunk)
      } catch (error) {
        console.error('Error sending push notifications:', error)
        return new Response(JSON.stringify({ error: 'Error sending push notifications' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        })
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
