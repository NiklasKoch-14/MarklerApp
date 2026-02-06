-- Password Reset Tokens Table
-- Stores one-time tokens for password reset functionality
-- Tokens are SHA-256 hashed for security
-- Expiration enforced at 15 minutes for security
-- Rate limiting tracked via created_at timestamps

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    agent_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP,
    ip_address VARCHAR(45), -- Supports IPv6 addresses
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_tokens_agent
        FOREIGN KEY (agent_id)
        REFERENCES agents(id)
        ON DELETE CASCADE
);

-- Index for fast token lookup during validation
CREATE INDEX idx_password_reset_tokens_token_hash
    ON password_reset_tokens(token_hash);

-- Index for agent queries (view all tokens for an agent)
CREATE INDEX idx_password_reset_tokens_agent_id
    ON password_reset_tokens(agent_id);

-- Index for cleanup job (find expired tokens)
CREATE INDEX idx_password_reset_tokens_expires_at
    ON password_reset_tokens(expires_at);

-- Index for rate limiting queries (created_at)
CREATE INDEX idx_password_reset_tokens_created_at
    ON password_reset_tokens(created_at);

COMMENT ON TABLE password_reset_tokens IS 'Stores secure tokens for password reset functionality with expiration and one-time use enforcement';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (64 hex characters)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration timestamp (15 minutes from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Flag to prevent token reuse';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address from which reset was requested (GDPR audit trail)';
