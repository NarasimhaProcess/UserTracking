
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_code TEXT UNIQUE NOT NULL, -- A unique identifier for the tenant (e.g., 'acme', 'globex')
    name TEXT NOT NULL,              -- Full name of the tenant (e.g., 'Acme Corporation')
    status TEXT NOT NULL DEFAULT 'active', -- e.g., 'active', 'inactive', 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read tenant info (adjust as needed)
CREATE POLICY "Allow authenticated users to read tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (true); -- Or more restrictive, e.g., only if they belong to the tenant
