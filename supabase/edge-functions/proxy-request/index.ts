import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Get tenant_code from header
    const tenantCode = req.headers.get('X-Tenant-Code')
    if (!tenantCode) {
      return new Response(
        JSON.stringify({ error: 'X-Tenant-Code header is missing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Initialize Supabase client for the *current* project (where this Edge Function lives)
    // This client will be used to query the tenant_credentials table.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service role key for secure access to tenant_credentials
    )

    // 3. Fetch tenant ID from the tenants table
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', tenantCode)
      .single()

    if (tenantError || !tenantData) {
      console.error('Error fetching tenant ID:', tenantError?.message || 'Tenant not found for code')
      return new Response(
        JSON.stringify({ error: 'Tenant not found for the provided code' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const tenantId = tenantData.id;

    // 4. Fetch tenant credentials from the database using tenantId
    let targetSupabaseUrl = Deno.env.get('SUPABASE_URL')!;
    let targetServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Try to fetch tenant ID from the tenants table
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', tenantCode)
      .single()

    if (!tenantError && tenantData) { // If tenant ID found, try to get tenant-specific credentials
      const tenantId = tenantData.id;

      const { data: tenantConfig, error: dbError } = await supabase
        .from('tenant_credentials')
        .select('supabase_url, supabase_service_role_key')
        .eq('tenant_id', tenantId)
        .single()

      if (!dbError && tenantConfig) { // If tenant credentials found, use them
        targetSupabaseUrl = tenantConfig.supabase_url;
        targetServiceRoleKey = tenantConfig.supabase_service_role_key;
      } else {
        console.warn('Tenant credentials not found for tenant ID:', tenantId, 'Falling back to master DB.');
      }
    } else {
      console.warn('Tenant not found for code:', tenantCode, 'Falling back to master DB.');
    }

    // Construct the target URL for the tenant's (or master) Supabase project
    // The incoming request URL path will be relative to the Edge Function.
    // We need to extract the path after /functions/v1/proxy-request/
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    // Find the index of 'proxy-request' and take everything after it
    const proxyFunctionIndex = pathSegments.indexOf('proxy-request')
    const targetPath = pathSegments.slice(proxyFunctionIndex + 1).join('/')

    let targetUrl;
    if (targetPath.startsWith('auth/v1')) {
      targetUrl = `${targetSupabaseUrl}/${targetPath}${url.search}`;
    } else {
      targetUrl = `${targetSupabaseUrl}/rest/v1/${targetPath}${url.search}`;
    }

    // 5. Prepare headers for forwarding
    const headers = new Headers(req.headers)
    // Remove host header as it's for the Edge Function, not the target
    headers.delete('host')
    // Set the Authorization header for the tenant's project using its service role key
    headers.set('apikey', targetServiceRoleKey)
    headers.set('Authorization', `Bearer ${targetServiceRoleKey}`)
    // Ensure Content-Type is preserved for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      headers.set('Content-Type', req.headers.get('Content-Type') || 'application/json');
    }

    // 6. Forward the request to the tenant's Supabase project
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body, // Pass the original request body
    })

    // 7. Return the response from the tenant's project
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

  } catch (error) {
    console.error('Proxy function error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})