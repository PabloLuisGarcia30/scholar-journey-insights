
-- Phase 1: Database Schema Corrections
-- Fix the fundamental design flaw by removing redundant student_profiles and linking everything to profiles.id

-- Step 1: Add student_id column to test_results to link to profiles.id (for students)
ALTER TABLE test_results 
ADD COLUMN authenticated_student_id UUID REFERENCES profiles(id);

-- Step 2: Update existing test_results to link to profiles where possible
-- This handles cases where we can match by student name
UPDATE test_results tr
SET authenticated_student_id = p.id
FROM profiles p, student_profiles sp
WHERE tr.student_id = sp.id 
AND p.full_name = sp.student_name
AND p.role = 'student';

-- Step 3: Make test_result_id optional for practice exercises in skill scores
-- This allows skill scores from practice exercises to exist without test results
ALTER TABLE content_skill_scores 
ALTER COLUMN test_result_id DROP NOT NULL;

ALTER TABLE subject_skill_scores 
ALTER COLUMN test_result_id DROP NOT NULL;

-- Step 4: Add authenticated_student_id to skill score tables
ALTER TABLE content_skill_scores 
ADD COLUMN authenticated_student_id UUID REFERENCES profiles(id);

ALTER TABLE subject_skill_scores 
ADD COLUMN authenticated_student_id UUID REFERENCES profiles(id);

-- Step 5: Update existing skill scores to link to profiles
UPDATE content_skill_scores css
SET authenticated_student_id = tr.authenticated_student_id
FROM test_results tr
WHERE css.test_result_id = tr.id
AND tr.authenticated_student_id IS NOT NULL;

UPDATE subject_skill_scores sss
SET authenticated_student_id = tr.authenticated_student_id
FROM test_results tr
WHERE sss.test_result_id = tr.id
AND tr.authenticated_student_id IS NOT NULL;

-- Step 6: Create proper class enrollment table linked to profiles
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES active_classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enrolled_by UUID REFERENCES profiles(id), -- Teacher who enrolled the student
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_profile_id, class_id)
);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_results_authenticated_student ON test_results(authenticated_student_id);
CREATE INDEX IF NOT EXISTS idx_content_skills_authenticated_student ON content_skill_scores(authenticated_student_id);
CREATE INDEX IF NOT EXISTS idx_subject_skills_authenticated_student ON subject_skill_scores(authenticated_student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);

-- Step 8: Update student_practice_sessions to use profiles.id
ALTER TABLE student_practice_sessions 
ADD COLUMN authenticated_student_id UUID REFERENCES profiles(id);

-- Step 9: Add trigger for updated_at on class_enrollments
CREATE TRIGGER update_class_enrollments_updated_at
    BEFORE UPDATE ON class_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Comments for documentation
COMMENT ON TABLE class_enrollments IS 'Links students (from profiles) to classes - managed by teachers';
COMMENT ON COLUMN test_results.authenticated_student_id IS 'Links to profiles.id for authenticated students';
COMMENT ON COLUMN content_skill_scores.authenticated_student_id IS 'Direct link to student profile for authenticated users';
COMMENT ON COLUMN subject_skill_scores.authenticated_student_id IS 'Direct link to student profile for authenticated users';
