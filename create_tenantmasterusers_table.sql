
CREATE TABLE public.tenantmasterusers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth user
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- Links to the tenant
    role TEXT NOT NULL DEFAULT 'user', -- e.g., 'admin', 'manager', 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, tenant_id) -- A user can only have one role per tenant
);

-- Add indexes for performance on frequently queried columns
CREATE INDEX ON public.tenantmasterusers (user_id);
CREATE INDEX ON public.tenantmasterusers (tenant_id);
CREATE INDEX ON public.tenantmasterusers (role);

-- Enable Row Level Security (RLS) for this table
ALTER TABLE public.tenantmasterusers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view their own tenantmasterusers entry
CREATE POLICY "Allow authenticated users to view their own tenantmasterusers entry"
ON public.tenantmasterusers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Tenant administrators can manage users within their tenant
-- This policy assumes you have a way to identify a tenant admin (e.g., a specific role in this table)
CREATE POLICY "Tenant admins can manage users within their tenant"
ON public.tenantmasterusers FOR ALL
TO authenticated
USING (
    -- Check if the current user is an admin for the tenant associated with this entry
    EXISTS (
        SELECT 1
        FROM public.tenantmasterusers AS tmu_admin
        WHERE tmu_admin.user_id = auth.uid()
          AND tmu_admin.tenant_id = tenantmasterusers.tenant_id
          AND tmu_admin.role = 'admin'
    )
);
