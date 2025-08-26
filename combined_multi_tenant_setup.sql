-- Combined SQL Script for Multi-Tenant Setup (Main Supabase Project)

-- Ensure uuid-ossp extension is enabled for uuid_generate_v4()
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------------------------------------------------------
-- 1. Tenants Table
-- Stores the master list of your tenants and their basic information.
----------------------------------------------------------------------
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


----------------------------------------------------------------------
-- 2. Tenant Credentials Table
-- Stores the connection details for each tenant's separate Supabase project.
-- IMPORTANT: This table contains sensitive keys and should be highly secured.
----------------------------------------------------------------------
CREATE TABLE public.tenant_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, -- Links to the tenants table
    supabase_url TEXT NOT NULL,                                                    -- URL of the tenant's Supabase project
    supabase_service_role_key TEXT NOT NULL,                                       -- Service Role Key of the tenant's Supabase project
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;

-- IMPORTANT RLS NOTE for tenant_credentials:
-- No RLS policies are added for authenticated users here.
-- This table should ONLY be accessed by your Edge Functions (using the project's service_role_key)
-- to prevent accidental exposure of tenant keys.


----------------------------------------------------------------------
-- 3. Tenant Master Users Table
-- Links users from auth.users to specific tenants and defines their roles.
----------------------------------------------------------------------
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
