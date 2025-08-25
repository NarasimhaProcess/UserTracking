CREATE TABLE tenant_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN tenant_id UUID REFERENCES tenants(id);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);
