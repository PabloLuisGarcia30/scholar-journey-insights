
-- Add teacher_id column to active_classes table to link classes to specific teachers
ALTER TABLE public.active_classes ADD COLUMN teacher_id uuid REFERENCES auth.users(id);

-- Enable Row Level Security on active_classes table
ALTER TABLE public.active_classes ENABLE ROW LEVEL SECURITY;

-- Create policy for teachers to only see their own classes
CREATE POLICY "Teachers can view their own classes" 
ON public.active_classes 
FOR SELECT 
USING (auth.uid() = teacher_id);

-- Create policy for teachers to only create classes for themselves
CREATE POLICY "Teachers can create their own classes" 
ON public.active_classes 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

-- Create policy for teachers to only update their own classes
CREATE POLICY "Teachers can update their own classes" 
ON public.active_classes 
FOR UPDATE 
USING (auth.uid() = teacher_id);

-- Create policy for teachers to only delete their own classes
CREATE POLICY "Teachers can delete their own classes" 
ON public.active_classes 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Update existing classes to assign them to the first teacher user if any exist
-- This is a temporary measure for existing data
UPDATE public.active_classes 
SET teacher_id = (
  SELECT id FROM public.profiles 
  WHERE role = 'teacher' 
  LIMIT 1
) 
WHERE teacher_id IS NULL;
