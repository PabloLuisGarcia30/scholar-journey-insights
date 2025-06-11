
-- Phase 1: Database Schema Migration (Corrected)
-- First, let's add the missing column to student_profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'authenticated_user_id') THEN
        ALTER TABLE student_profiles 
        ADD COLUMN authenticated_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for student_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_profiles_auth_user') THEN
        CREATE INDEX idx_student_profiles_auth_user ON student_profiles(authenticated_user_id);
    END IF;
END $$;

-- Add authenticated_student_id columns only if they don't exist
DO $$ 
BEGIN
    -- Check and add to content_skill_scores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'content_skill_scores' AND column_name = 'authenticated_student_id') THEN
        ALTER TABLE content_skill_scores 
        ADD COLUMN authenticated_student_id UUID REFERENCES auth.users(id);
    END IF;

    -- Check and add to subject_skill_scores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subject_skill_scores' AND column_name = 'authenticated_student_id') THEN
        ALTER TABLE subject_skill_scores 
        ADD COLUMN authenticated_student_id UUID REFERENCES auth.users(id);
    END IF;

    -- Check and add to student_practice_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_practice_sessions' AND column_name = 'authenticated_student_id') THEN
        ALTER TABLE student_practice_sessions 
        ADD COLUMN authenticated_student_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create indexes only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_test_results_auth_student') THEN
        CREATE INDEX idx_test_results_auth_student ON test_results(authenticated_student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_skills_auth_student') THEN
        CREATE INDEX idx_content_skills_auth_student ON content_skill_scores(authenticated_student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subject_skills_auth_student') THEN
        CREATE INDEX idx_subject_skills_auth_student ON subject_skill_scores(authenticated_student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_practice_sessions_auth_student') THEN
        CREATE INDEX idx_practice_sessions_auth_student ON student_practice_sessions(authenticated_student_id);
    END IF;
END $$;

-- Create migration helper function
CREATE OR REPLACE FUNCTION migrate_student_data_to_auth_users()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function will be used later when we have proper user mappings
  -- For now, it's a placeholder for the migration process
  RAISE NOTICE 'Migration function created. Ready for data migration when user mappings are established.';
END;
$$;

-- Create or replace the transition view
CREATE OR REPLACE VIEW student_data_transition AS
SELECT 
  sp.id as student_profile_id,
  sp.student_name,
  sp.student_id as mock_student_id,
  sp.authenticated_user_id,
  p.id as profile_id,
  p.full_name as auth_user_name,
  p.email,
  CASE 
    WHEN sp.authenticated_user_id IS NOT NULL THEN 'linked'
    ELSE 'unlinked'
  END as migration_status
FROM student_profiles sp
LEFT JOIN profiles p ON sp.authenticated_user_id = p.id;
