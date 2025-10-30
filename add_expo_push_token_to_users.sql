-- Add expo_push_token column to the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;