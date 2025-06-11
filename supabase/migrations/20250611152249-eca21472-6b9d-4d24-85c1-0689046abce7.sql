
-- Add concept_missed fields to mistake_patterns table
ALTER TABLE mistake_patterns 
ADD COLUMN concept_missed_id uuid REFERENCES concept_index(id),
ADD COLUMN concept_missed_description text;

-- Add index for better query performance
CREATE INDEX idx_mistake_patterns_concept_missed ON mistake_patterns(concept_missed_id);

-- Add comments for documentation
COMMENT ON COLUMN mistake_patterns.concept_missed_id IS 'Reference to the concept from concept_index that the student missed';
COMMENT ON COLUMN mistake_patterns.concept_missed_description IS 'GPT-generated one-sentence description of the missed concept';
