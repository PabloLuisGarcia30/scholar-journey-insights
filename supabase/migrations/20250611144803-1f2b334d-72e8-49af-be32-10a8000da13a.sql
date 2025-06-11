
-- Phase 1: Database Schema Enhancement
-- Add conceptual anchor point fields to mistake_patterns table
ALTER TABLE mistake_patterns 
ADD COLUMN expected_concept text,
ADD COLUMN concept_mastery_level text CHECK (concept_mastery_level IN ('mastered', 'partial', 'not_demonstrated', 'unknown')),
ADD COLUMN concept_source text CHECK (concept_source IN ('curriculum_mapping', 'gpt_inference', 'manual_tag', 'skill_mapping'));

-- Add index for better query performance on concept analysis
CREATE INDEX idx_mistake_patterns_expected_concept ON mistake_patterns(expected_concept);
CREATE INDEX idx_mistake_patterns_concept_mastery ON mistake_patterns(concept_mastery_level);

-- Add comments for documentation
COMMENT ON COLUMN mistake_patterns.expected_concept IS 'The core concept the student should have demonstrated mastery of';
COMMENT ON COLUMN mistake_patterns.concept_mastery_level IS 'Level of concept mastery demonstrated: mastered, partial, not_demonstrated, unknown';
COMMENT ON COLUMN mistake_patterns.concept_source IS 'How the concept was determined: curriculum_mapping, gpt_inference, manual_tag, skill_mapping';
