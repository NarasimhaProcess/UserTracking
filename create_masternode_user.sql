-- 1. Create the "masternode" tenant
INSERT INTO tenants (name) VALUES ('masternode');

-- 2. Get the ID of the "masternode" tenant
--    (You'll need to run this command and copy the resulting ID)
SELECT id FROM tenants WHERE name = 'masternode';

-- 3. Create a new user in the auth.users table (if they don't already exist)
--    Replace with your desired email and password
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at)
VALUES (uuid_generate_v4(), uuid_generate_v4(), 'authenticated', 'authenticated', 'superadmin@example.com', crypt('password', gen_salt('bf')), now(), uuid_generate_v4(), now(), '', '', now(), now(), '{"provider":"email","providers":["email"]}', '{}', true, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null);


-- 4. Get the ID of the user you just created
SELECT id FROM auth.users WHERE email = 'superadmin@example.com';

-- 5. Create a corresponding user in the public.users table
--    Replace 'PASTE_USER_ID_HERE' and 'PASTE_MASTERNODE_TENANT_ID_HERE'
--    with the IDs you retrieved from the previous steps.
INSERT INTO public.users (id, email, name, user_type, tenant_id)
VALUES ('PASTE_USER_ID_HERE', 'superadmin@example.com', 'Master Admin', 'superadmin', 'PASTE_MASTERNODE_TENANT_ID_HERE');
