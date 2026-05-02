import { createClient } from 'npm:@supabase/supabase-js@2';

console.log("Hello from send-welcome-notification Function!");

// This interface helps TypeScript understand the structure of the user data
interface NewUser {
  id: string;
  email?: string;
  // Add any other fields from auth.users you might need
}

Deno.serve(async (req) => {
  try {
    // The request body will contain the new user record from the trigger
    const { record: newUser } = await req.json() as { record: NewUser };

    // It can take a moment for the client app to get the push token and save it.
    // We will wait for a short period before trying to fetch it.
    // In a production app, a more robust queueing system might be better.
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Create a Supabase admin client to securely query the database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the user's profile to get their push token
    const { data: userProfile, error } = await supabaseAdmin
      .from('users') // Your public users table
      .select('expo_push_token, name')
      .eq('id', newUser.id)
      .single();

    if (error) {
      console.error(`Error fetching profile for user ${newUser.id}:`, error);
      throw error;
    }

    const pushToken = userProfile?.expo_push_token;
    const userName = userProfile?.name || newUser.email?.split('@')[0] || 'new user';

    if (!pushToken) {
      console.log(`User ${newUser.id} does not have a push token yet. Skipping notification.`);
      return new Response(JSON.stringify({ message: "No push token found." }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Send the push notification using the Expo Push API
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: 'Welcome to the App! 🎉',
        body: `Hi ${userName}! We're so glad to have you here.`,
      }),
    });

    const responseData = await res.json();
    console.log('Expo Push API response:', responseData);

    return new Response(JSON.stringify({ success: true, message: "Notification sent." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(String(error?.message ?? error), { status: 500 });
  }
});