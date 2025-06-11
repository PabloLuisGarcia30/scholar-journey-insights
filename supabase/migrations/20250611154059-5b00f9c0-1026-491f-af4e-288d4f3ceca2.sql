
-- Add confidence score and teacher validation columns to mistake_patterns table
ALTER TABLE mistake_patterns 
ADD COLUMN concept_confidence NUMERIC(3,2) CHECK (concept_confidence >= 0.0 AND concept_confidence <= 1.0),
ADD COLUMN teacher_validated BOOLEAN DEFAULT false,
ADD COLUMN teacher_override_concept_id UUID REFERENCES concept_index(id),
ADD COLUMN teacher_validation_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN teacher_override_reason TEXT;

-- Add indexes for efficient querying
CREATE INDEX idx_mistake_patterns_concept_confidence ON mistake_patterns(concept_confidence);
CREATE INDEX idx_mistake_patterns_teacher_validated ON mistake_patterns(teacher_validated);
CREATE INDEX idx_mistake_patterns_validation_timestamp ON mistake_patterns(teacher_validation_timestamp);

-- Add comments for documentation
COMMENT ON COLUMN mistake_patterns.concept_confidence IS 'AI confidence score (0.0-1.0) for the concept detection';
COMMENT ON COLUMN mistake_patterns.teacher_validated IS 'Whether a teacher has reviewed and confirmed/overridden the AI concept detection';
COMMENT ON COLUMN mistake_patterns.teacher_override_concept_id IS 'Concept ID selected by teacher if they override the AI suggestion';
COMMENT ON COLUMN mistake_patterns.teacher_validation_timestamp IS 'When the teacher performed the validation';
COMMENT ON COLUMN mistake_patterns.teacher_override_reason IS 'Optional reason provided by teacher for overriding AI suggestion';
