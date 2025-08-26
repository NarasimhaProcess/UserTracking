
CREATE TABLE public.tenant_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, -- Links to the tenants table
    supabase_url TEXT NOT NULL,                                                    -- URL of the tenant's Supabase project
    supabase_service_role_key TEXT NOT NULL,                                       -- Service Role Key of the tenant's Supabase project
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: RLS for this table should be very restrictive.
-- Only your Edge Functions (via service_role_key) should be able to read this.
-- No policies for authenticated users should be created unless absolutely necessary and highly secured.
-- For now, no RLS policies are added for authenticated users to prevent accidental exposure.
-- The Edge Function will access this table using the project's service_role_key, bypassing RLS.
