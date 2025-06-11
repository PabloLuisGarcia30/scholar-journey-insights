
-- Add teacher_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN teacher_id text UNIQUE;

-- Create a function to generate sequential teacher IDs
CREATE OR REPLACE FUNCTION public.generate_teacher_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number integer;
  teacher_id_result text;
BEGIN
  -- Get the next sequential number by counting existing teacher IDs
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(teacher_id FROM 4) AS integer)), 0
  ) + 1
  INTO next_number
  FROM public.profiles 
  WHERE teacher_id IS NOT NULL 
  AND teacher_id ~ '^TCH[0-9]+$';
  
  -- Format as TCH001, TCH002, etc.
  teacher_id_result := 'TCH' || LPAD(next_number::text, 3, '0');
  
  RETURN teacher_id_result;
END;
$$;

-- Update the existing handle_new_user function to generate teacher IDs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, teacher_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student') = 'teacher' 
      THEN generate_teacher_id()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

-- Backfill teacher IDs for existing teacher accounts
UPDATE public.profiles 
SET teacher_id = generate_teacher_id()
WHERE role = 'teacher' AND teacher_id IS NULL;

-- Add comment to document the teacher_id column
COMMENT ON COLUMN public.profiles.teacher_id IS 'Human-readable teacher identifier (e.g., TCH001, TCH002) - only set for teacher accounts';
