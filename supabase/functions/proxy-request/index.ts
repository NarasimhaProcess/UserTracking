import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
serve(async (req)=>{
  try {
    // Get tenant ID
    const tenantCode = req.headers.get('tenant-id'); //|| "42f07da3-fc46-421e-bdfe-74e0c9daf17b";
    // Env vars
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: "Server configuration error",
        details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Fetch tenant credentials
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const proxyFunctionIndex = pathSegments.indexOf('proxy-request');
    const targetPath = pathSegments.slice(proxyFunctionIndex + 1).join('/');
    let targetUrl;
    let serviceRoleKey = supabaseServiceKey;
    if (targetPath.startsWith('auth/v1')) {
      targetUrl = `${supabaseUrl}/${targetPath}`;
    } else {
      const tenantCode = req.headers.get('tenant-id');
      if (!tenantCode) {
        return new Response(JSON.stringify({
          error: 'tenant-id header is missing'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      const { data: tenantRow, error: tenantErr } = await supabase.from('tenants').select('id, tenant_credentials ( supabase_url, supabase_service_role_key )').eq('id', tenantCode).single();
      if (tenantErr || !tenantRow) {
        return new Response(JSON.stringify({
          error: 'Tenant lookup failed',
          details: tenantErr?.message || 'Not found'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      const creds = tenantRow.tenant_credentials;
      const { supabase_url, supabase_service_role_key } = creds;
      serviceRoleKey = supabase_service_role_key;
      targetUrl = `${supabase_url}/rest/v1/${targetPath}`;
    }
    const newSearchParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()){
      let formattedValue = value;
      if (!value.includes('.')) {
        if (value.startsWith(">=")) {
          formattedValue = `gte.${value.substring(2)}`;
        } else if (value.startsWith("<=")) {
          formattedValue = `lte.${value.substring(2)}`;
        } else if (value.startsWith(">")) {
          formattedValue = `gt.${value.substring(1)}`;
        } else if (value.startsWith("<")) {
          formattedValue = `lt.${value.substring(1)}`;
        } else if (value.startsWith("~")) {
          // treat "~something" as like.*something*
          formattedValue = `like.*${value.substring(1)}*`;
        } else {
          formattedValue = `eq.${value}`;
        }
      }
      newSearchParams.append(key, formattedValue);
    }
    targetUrl = `${targetUrl}?${newSearchParams.toString()}`;
    console.log("Proxying to:", targetUrl);
    const headers = new Headers();
    for (const [key, value] of req.headers.entries()){
      if (![
        'host',
        'tenant-id'
      ].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }
    headers.set('apikey', serviceRoleKey);
    headers.set('Authorization', `Bearer ${serviceRoleKey}`);
    if ([
      "POST",
      "PUT",
      "PATCH"
    ].includes(req.method) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    // Proxy call
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.body
    });
    let responseBody = await response.text();
    if (!responseBody || responseBody.trim() === "") {
      responseBody = JSON.stringify({
        success: true,
        message: "Operation completed",
        status: response.status
      });
    }
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
