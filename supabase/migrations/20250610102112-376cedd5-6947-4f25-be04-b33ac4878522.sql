
-- Create class_sessions table to track when classes are active
CREATE TABLE public.class_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES active_classes(id),
  lesson_plan_id UUID REFERENCES lesson_plans(id),
  teacher_id UUID NOT NULL,
  session_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_exercises table for individual student practice exercises
CREATE TABLE public.student_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id),
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_score NUMERIC NOT NULL,
  exercise_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for class_sessions
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their class sessions"
  ON public.class_sessions
  FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view active sessions for their classes"
  ON public.class_sessions
  FOR SELECT
  USING (
    is_active = true AND
    class_id IN (
      SELECT id FROM active_classes
      WHERE auth.uid() = ANY(students)
    )
  );

-- Add RLS policies for student_exercises
ALTER TABLE public.student_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage exercises in their sessions"
  ON public.student_exercises
  FOR ALL
  USING (
    class_session_id IN (
      SELECT id FROM class_sessions
      WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view and update their own exercises"
  ON public.student_exercises
  FOR ALL
  USING (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX idx_class_sessions_active ON class_sessions(is_active);
CREATE INDEX idx_student_exercises_session_id ON student_exercises(class_session_id);
CREATE INDEX idx_student_exercises_student_id ON student_exercises(student_id);
CREATE INDEX idx_student_exercises_status ON student_exercises(status);

-- Add trigger for updated_at columns
CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_exercises_updated_at
  BEFORE UPDATE ON student_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
