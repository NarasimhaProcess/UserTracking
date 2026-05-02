import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import OpenAI from 'npm:openai@4.24.0'

// Define the request body type
interface SummarizeRequest {
  conversation_id: number;
  api_key?: string; // Optional API key override
}

// Define the response type for messages
interface Message {
  id: number;
  content: string;
  sender_username: string;
  created_at: string;
}

Deno.serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse the request body
    const { conversation_id, api_key } = await req.json() as SummarizeRequest;
    
    if (!conversation_id) {
      return new Response(JSON.stringify({ error: 'conversation_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get OpenAI API key from environment or request
    const openaiApiKey = api_key || Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select('title')
      .eq('id', conversation_id)
      .single();

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get messages with sender usernames
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        profiles:sender_id (username)
      `)
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages found in conversation' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => {
      return {
        id: msg.id,
        content: msg.content,
        sender_username: msg.profiles.username,
        created_at: msg.created_at
      };
    });

    // Create a conversation transcript for OpenAI
    const transcript = formattedMessages.map(msg => 
      `${msg.sender_username} (${new Date(msg.created_at).toLocaleString()}): ${msg.content}`
    ).join('\n\n');

    // Generate summary with OpenAI
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that summarizes conversations. 
          Create a concise summary (maximum 250 words) of the following conversation. 
          Focus on the main topics discussed, key decisions made, and any action items.
          Format your response as a single paragraph without bullet points.`
        },
        {
          role: 'user',
          content: `Conversation Title: ${conversation.title}\n\nTranscript:\n${transcript}`
        }
      ],
      max_tokens: 500,
    });

    const summary = chatCompletion.choices[0].message.content;

    // Store the summary in the database
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('message_summaries')
      .upsert({
        conversation_id,
        summary,
        message_count: messages.length,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id'
      })
      .select()
      .single();

    if (summaryError) {
      return new Response(JSON.stringify({ error: 'Failed to store summary', details: summaryError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      summary: summaryData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});