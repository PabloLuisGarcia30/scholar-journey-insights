
-- Phase 1: Fix Core Student ID Integration - Database Schema Updates

-- 1. Update exam_skill_mappings to add concept_missed_short for grouping analytics
ALTER TABLE exam_skill_mappings 
ADD COLUMN concept_missed_short TEXT;

-- 2. Add indexes for Student ID performance optimization
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results(student_id);

-- 3. Add proper class context tracking to test_results (ensure class_id is properly used)
-- This column already exists but ensure it's properly indexed
CREATE INDEX IF NOT EXISTS idx_test_results_class_id ON test_results(class_id);
CREATE INDEX IF NOT EXISTS idx_test_results_exam_class ON test_results(exam_id, class_id);

-- 4. Add student_id column to content_skill_scores and subject_skill_scores for direct linking
ALTER TABLE content_skill_scores 
ADD COLUMN student_id UUID REFERENCES student_profiles(id);

ALTER TABLE subject_skill_scores 
ADD COLUMN student_id UUID REFERENCES student_profiles(id);

-- 5. Create indexes for the new student_id columns
CREATE INDEX idx_content_skill_scores_student_id ON content_skill_scores(student_id);
CREATE INDEX idx_subject_skill_scores_student_id ON subject_skill_scores(student_id);

-- 6. Add composite indexes for class-based analytics
CREATE INDEX idx_content_skill_scores_student_skill ON content_skill_scores(student_id, skill_name);
CREATE INDEX idx_subject_skill_scores_student_skill ON subject_skill_scores(student_id, skill_name);

-- 7. Add class enrollment tracking table for automatic enrollment
CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES active_classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enrollment_method TEXT NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual', 'bulk_import'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- 8. Add indexes for enrollment tracking
CREATE INDEX idx_student_class_enrollments_student ON student_class_enrollments(student_id);
CREATE INDEX idx_student_class_enrollments_class ON student_class_enrollments(class_id);
CREATE INDEX idx_student_class_enrollments_active ON student_class_enrollments(is_active);

-- 9. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_class_enrollments_updated_at
    BEFORE UPDATE ON student_class_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Comments for documentation
COMMENT ON TABLE student_class_enrollments IS 'Tracks student enrollment in classes with automatic enrollment from test grading';
COMMENT ON COLUMN student_class_enrollments.enrollment_method IS 'How the student was enrolled: automatic (from test grading), manual (teacher added), bulk_import';
COMMENT ON COLUMN exam_skill_mappings.concept_missed_short IS 'Short identifier for grouping missed concepts across questions for analytics';
