import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Initialize Supabase client for the Edge Function
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role key for backend operations
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch push tokens for the user from your database
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', user_id)

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError)
      return new Response(JSON.stringify({ error: 'Failed to fetch push tokens' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens found for user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const expoPushTokens = tokens.map((t) => t.push_token)

    // Send notification using Expo Push Notification Service
    // You might want to batch these requests if you have many tokens
    const messages = expoPushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: 'Welcome Back!',
      body: 'You have successfully logged in to the app.',
      data: { some: 'data' }, // Optional data payload
    }))

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const result = await response.json()
    console.log('Expo Push API Response:', result)

    if (result.errors) {
      console.error('Expo Push API Errors:', result.errors)
      // Handle errors, e.g., remove invalid tokens from your DB
    }

    return new Response(JSON.stringify({ message: 'Notification sent', result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
