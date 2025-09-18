-- Migration: 001_append_only_admin_actions.sql
-- Purpose: Implement append-only constraint for admin_actions table
-- Date: 2024-12-01

-- Create function to prevent updates and deletes
CREATE OR REPLACE FUNCTION prevent_admin_action_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Admin actions cannot be updated - this is an append-only audit log';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Admin actions cannot be deleted - this is an append-only audit log';
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent updates and deletes
DROP TRIGGER IF EXISTS admin_action_append_only_trigger ON admin_actions;
CREATE TRIGGER admin_action_append_only_trigger
    BEFORE UPDATE OR DELETE ON admin_actions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_admin_action_changes();

-- Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_org_created_at ON admin_actions(org_id, created_at);

-- Add comment explaining the constraint
COMMENT ON TABLE admin_actions IS 'Append-only audit log of all administrative actions. Updates and deletes are prevented by database triggers.';

-- Create view for read-only access (optional, for additional security)
CREATE OR REPLACE VIEW admin_actions_readonly AS
SELECT * FROM admin_actions;

-- Grant appropriate permissions
-- Note: In production, you'd want to restrict UPDATE/DELETE permissions at the database level
-- GRANT SELECT ON admin_actions_readonly TO readonly_role;
-- GRANT INSERT ON admin_actions TO write_role;
