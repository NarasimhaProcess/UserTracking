-- Drop the existing constraint if it exists
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS valid_customer_status;

-- Add the new check constraint with all the valid statuses
ALTER TABLE public.customers
ADD CONSTRAINT valid_customer_status CHECK (status IN ('Pending', 'Active', 'Inactive', 'Closed', 'Defaulted'));

-- Update the comment on the status column
COMMENT ON COLUMN public.customers.status IS 'The current status of the customer: Pending, Active, Inactive, Closed, Defaulted';