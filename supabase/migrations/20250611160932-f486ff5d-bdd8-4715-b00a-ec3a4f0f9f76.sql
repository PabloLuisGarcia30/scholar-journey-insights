
-- Create table to store GPT's natural language rationales for skill mappings
CREATE TABLE public.exam_skill_rationales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  skill_id UUID NOT NULL,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('content', 'subject')),
  skill_name TEXT NOT NULL,
  rationale TEXT NOT NULL,
  pedagogical_reasoning TEXT,
  difficulty_analysis TEXT,
  prerequisite_gaps TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_exam_skill_rationales_exam_id ON exam_skill_rationales(exam_id);
CREATE INDEX idx_exam_skill_rationales_question_number ON exam_skill_rationales(exam_id, question_number);
CREATE INDEX idx_exam_skill_rationales_skill_id ON exam_skill_rationales(skill_id);

-- Add composite index for exam analysis queries
CREATE INDEX idx_exam_skill_rationales_exam_question ON exam_skill_rationales(exam_id, question_number, skill_type);

-- Add comments for documentation
COMMENT ON TABLE exam_skill_rationales IS 'Stores GPT natural language rationales for skill mappings to support IntelliCoach nudges and deeper analysis';
COMMENT ON COLUMN exam_skill_rationales.rationale IS 'Main natural language explanation for why this skill was mapped to this question';
COMMENT ON COLUMN exam_skill_rationales.pedagogical_reasoning IS 'Detailed pedagogical explanation of the skill-question relationship';
COMMENT ON COLUMN exam_skill_rationales.difficulty_analysis IS 'Analysis of question difficulty and cognitive load for this skill';
COMMENT ON COLUMN exam_skill_rationales.prerequisite_gaps IS 'Identified prerequisite skills that may be missing if student struggles';
