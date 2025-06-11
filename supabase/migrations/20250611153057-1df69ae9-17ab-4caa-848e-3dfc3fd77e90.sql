
-- Add misconception_signature column to mistake_patterns table
ALTER TABLE mistake_patterns 
ADD COLUMN misconception_signature text;

-- Add index for efficient grouping queries
CREATE INDEX idx_mistake_patterns_misconception_signature ON mistake_patterns(misconception_signature);

-- Add comment for documentation
COMMENT ON COLUMN mistake_patterns.misconception_signature IS 'Normalized hash string for grouping students by shared misconceptions (e.g., "combine-unlike-terms-polynomials")';
