CREATE OR REPLACE FUNCTION can_close_customer_account(p_customer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_repaid NUMERIC;
    amount_given NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO total_repaid
    FROM transactions
    WHERE customer_id = p_customer_id AND transaction_type = 'repayment';

    SELECT COALESCE(c.amount_given, 0)
    INTO amount_given
    FROM customers c
    WHERE id = p_customer_id;

    RETURN amount_given <= total_repaid;
END;
$$ LANGUAGE plpgsql;