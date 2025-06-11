export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_classes: {
        Row: {
          avg_gpa: number | null
          class_time: string | null
          created_at: string
          day_of_week: string | null
          end_time: string | null
          grade: string
          id: string
          name: string
          student_count: number | null
          students: string[] | null
          subject: string
          teacher: string
          updated_at: string
        }
        Insert: {
          avg_gpa?: number | null
          class_time?: string | null
          created_at?: string
          day_of_week?: string | null
          end_time?: string | null
          grade: string
          id?: string
          name: string
          student_count?: number | null
          students?: string[] | null
          subject: string
          teacher: string
          updated_at?: string
        }
        Update: {
          avg_gpa?: number | null
          class_time?: string | null
          created_at?: string
          day_of_week?: string | null
          end_time?: string | null
          grade?: string
          id?: string
          name?: string
          student_count?: number | null
          students?: string[] | null
          subject?: string
          teacher?: string
          updated_at?: string
        }
        Relationships: []
      }
      active_students: {
        Row: {
          created_at: string
          email: string | null
          gpa: number | null
          id: string
          major: string | null
          name: string
          updated_at: string
          year: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          gpa?: number | null
          id?: string
          major?: string | null
          name: string
          updated_at?: string
          year?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          gpa?: number | null
          id?: string
          major?: string | null
          name?: string
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      answer_keys: {
        Row: {
          acceptable_answers: Json | null
          correct_answer: string
          created_at: string
          exam_id: string
          exercise_type: string | null
          explanation: string | null
          id: string
          options: Json | null
          points: number
          practice_exercise_id: string | null
          question_number: number
          question_text: string
          question_type: string
        }
        Insert: {
          acceptable_answers?: Json | null
          correct_answer: string
          created_at?: string
          exam_id: string
          exercise_type?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number
          practice_exercise_id?: string | null
          question_number: number
          question_text: string
          question_type: string
        }
        Update: {
          acceptable_answers?: Json | null
          correct_answer?: string
          created_at?: string
          exam_id?: string
          exercise_type?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number
          practice_exercise_id?: string | null
          question_number?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "answer_keys_practice_exercise_id_fkey"
            columns: ["practice_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignment_type: string | null
          class_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean | null
          teacher_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_type?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          teacher_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_type?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          teacher_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_content_skills: {
        Row: {
          class_id: string
          content_skill_id: string
          created_at: string
          id: string
        }
        Insert: {
          class_id: string
          content_skill_id: string
          created_at?: string
          id?: string
        }
        Update: {
          class_id?: string
          content_skill_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_content_skills_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_content_skills_content_skill_id_fkey"
            columns: ["content_skill_id"]
            isOneToOne: false
            referencedRelation: "content_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          lesson_plan_id: string | null
          session_name: string
          started_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          lesson_plan_id?: string | null
          session_name: string
          started_at?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          lesson_plan_id?: string | null
          session_name?: string
          started_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subject_skills: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_skill_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_skill_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subject_skills_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subject_skills_subject_skill_id_fkey"
            columns: ["subject_skill_id"]
            isOneToOne: false
            referencedRelation: "subject_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      content_skill_scores: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          points_possible: number
          practice_exercise_id: string | null
          score: number
          skill_name: string
          test_result_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned: number
          points_possible: number
          practice_exercise_id?: string | null
          score: number
          skill_name: string
          test_result_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          points_possible?: number
          practice_exercise_id?: string | null
          score?: number
          skill_name?: string
          test_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_skill_scores_practice_exercise_id_fkey"
            columns: ["practice_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_skill_scores_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      content_skills: {
        Row: {
          created_at: string
          grade: string
          id: string
          skill_description: string
          skill_name: string
          subject: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string
          id?: string
          skill_description: string
          skill_name: string
          subject?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          skill_description?: string
          skill_name?: string
          subject?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_recovery_sessions: {
        Row: {
          attempts_count: number
          completed_at: string | null
          created_at: string
          error_type: string
          final_success: boolean | null
          id: string
          original_request_id: string
          recovery_details: Json | null
          recovery_strategy: string
          total_recovery_time_ms: number | null
        }
        Insert: {
          attempts_count?: number
          completed_at?: string | null
          created_at?: string
          error_type: string
          final_success?: boolean | null
          id?: string
          original_request_id: string
          recovery_details?: Json | null
          recovery_strategy: string
          total_recovery_time_ms?: number | null
        }
        Update: {
          attempts_count?: number
          completed_at?: string | null
          created_at?: string
          error_type?: string
          final_success?: boolean | null
          id?: string
          original_request_id?: string
          recovery_details?: Json | null
          recovery_strategy?: string
          total_recovery_time_ms?: number | null
        }
        Relationships: []
      }
      exam_skill_analysis: {
        Row: {
          ai_analysis_data: Json | null
          analysis_completed_at: string | null
          analysis_started_at: string | null
          analysis_status: string
          analysis_version: number
          content_skills_found: number
          created_at: string
          error_message: string | null
          exam_id: string
          id: string
          mapped_questions: number
          subject_skills_found: number
          total_questions: number
          updated_at: string
        }
        Insert: {
          ai_analysis_data?: Json | null
          analysis_completed_at?: string | null
          analysis_started_at?: string | null
          analysis_status?: string
          analysis_version?: number
          content_skills_found?: number
          created_at?: string
          error_message?: string | null
          exam_id: string
          id?: string
          mapped_questions?: number
          subject_skills_found?: number
          total_questions?: number
          updated_at?: string
        }
        Update: {
          ai_analysis_data?: Json | null
          analysis_completed_at?: string | null
          analysis_started_at?: string | null
          analysis_status?: string
          analysis_version?: number
          content_skills_found?: number
          created_at?: string
          error_message?: string | null
          exam_id?: string
          id?: string
          mapped_questions?: number
          subject_skills_found?: number
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      exam_skill_mappings: {
        Row: {
          confidence: number
          created_at: string
          exam_id: string
          id: string
          question_number: number
          skill_id: string
          skill_name: string
          skill_type: string
          skill_weight: number
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          exam_id: string
          id?: string
          question_number: number
          skill_id: string
          skill_name: string
          skill_type: string
          skill_weight?: number
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          exam_id?: string
          id?: string
          question_number?: number
          skill_id?: string
          skill_name?: string
          skill_type?: string
          skill_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          class_id: string | null
          class_name: string | null
          created_at: string
          description: string | null
          exam_id: string
          id: string
          time_limit: number | null
          title: string
          total_points: number | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          description?: string | null
          exam_id: string
          id?: string
          time_limit?: number | null
          title: string
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          description?: string | null
          exam_id?: string
          id?: string
          time_limit?: number | null
          title?: string
          total_points?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json
          files: Json
          id: string
          max_retries: number
          priority: string
          progress: number
          results: Json
          retry_count: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json
          files: Json
          id: string
          max_retries?: number
          priority?: string
          progress?: number
          results?: Json
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json
          files?: Json
          id?: string
          max_retries?: number
          priority?: string
          progress?: number
          results?: Json
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      lesson_plan_practice_exercises: {
        Row: {
          created_at: string
          exercise_data: Json
          exercise_type: string
          generated_at: string
          id: string
          lesson_plan_id: string
          student_id: string
          student_name: string
        }
        Insert: {
          created_at?: string
          exercise_data: Json
          exercise_type?: string
          generated_at?: string
          id?: string
          lesson_plan_id: string
          student_id: string
          student_name: string
        }
        Update: {
          created_at?: string
          exercise_data?: Json
          exercise_type?: string
          generated_at?: string
          id?: string
          lesson_plan_id?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plan_practice_exercises_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plan_students: {
        Row: {
          created_at: string
          id: string
          lesson_plan_id: string
          student_id: string
          student_name: string
          target_skill_name: string
          target_skill_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_plan_id: string
          student_id: string
          student_name: string
          target_skill_name: string
          target_skill_score: number
        }
        Update: {
          created_at?: string
          id?: string
          lesson_plan_id?: string
          student_id?: string
          student_name?: string
          target_skill_name?: string
          target_skill_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plan_students_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          class_id: string
          class_name: string
          created_at: string
          exercises_data: Json | null
          grade: string
          id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          subject: string
          teacher_name: string
          updated_at: string
        }
        Insert: {
          class_id: string
          class_name: string
          created_at?: string
          exercises_data?: Json | null
          grade: string
          id?: string
          scheduled_date: string
          scheduled_time: string
          status?: string
          subject: string
          teacher_name: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          class_name?: string
          created_at?: string
          exercises_data?: Json | null
          grade?: string
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          subject?: string
          teacher_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      mistake_patterns: {
        Row: {
          confidence_score: number | null
          correct_answer: string
          created_at: string
          feedback_given: string | null
          grading_method: string | null
          id: string
          is_correct: boolean
          mistake_type: string | null
          question_id: string
          question_number: number
          question_type: string
          skill_targeted: string
          student_answer: string
          student_exercise_id: string
        }
        Insert: {
          confidence_score?: number | null
          correct_answer: string
          created_at?: string
          feedback_given?: string | null
          grading_method?: string | null
          id?: string
          is_correct: boolean
          mistake_type?: string | null
          question_id: string
          question_number: number
          question_type: string
          skill_targeted: string
          student_answer: string
          student_exercise_id: string
        }
        Update: {
          confidence_score?: number | null
          correct_answer?: string
          created_at?: string
          feedback_given?: string | null
          grading_method?: string | null
          id?: string
          is_correct?: boolean
          mistake_type?: string | null
          question_id?: string
          question_number?: number
          question_type?: string
          skill_targeted?: string
          student_answer?: string
          student_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_patterns_student_exercise_id_fkey"
            columns: ["student_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          recipient_id: string | null
          sender_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_benchmarks: {
        Row: {
          batch_size: number | null
          id: string
          operation_type: string
          optimization_notes: string | null
          success_rate: number
          system_load: string | null
          timestamp: string
          total_processing_time_ms: number
          validation_overhead_percent: number
          validation_time_ms: number
        }
        Insert: {
          batch_size?: number | null
          id?: string
          operation_type: string
          optimization_notes?: string | null
          success_rate: number
          system_load?: string | null
          timestamp?: string
          total_processing_time_ms: number
          validation_overhead_percent: number
          validation_time_ms: number
        }
        Update: {
          batch_size?: number | null
          id?: string
          operation_type?: string
          optimization_notes?: string | null
          success_rate?: number
          system_load?: string | null
          timestamp?: string
          total_processing_time_ms?: number
          validation_overhead_percent?: number
          validation_time_ms?: number
        }
        Relationships: []
      }
      practice_answer_keys: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          metadata: Json | null
          questions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          metadata?: Json | null
          questions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          metadata?: Json | null
          questions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      question_time_tracking: {
        Row: {
          answer_changes_count: number
          created_at: string
          id: string
          question_id: string
          question_number: number
          student_exercise_id: string
          time_answered: string | null
          time_spent_seconds: number | null
          time_started: string
          updated_at: string
        }
        Insert: {
          answer_changes_count?: number
          created_at?: string
          id?: string
          question_id: string
          question_number: number
          student_exercise_id: string
          time_answered?: string | null
          time_spent_seconds?: number | null
          time_started?: string
          updated_at?: string
        }
        Update: {
          answer_changes_count?: number
          created_at?: string
          id?: string
          question_id?: string
          question_number?: number
          student_exercise_id?: string
          time_answered?: string | null
          time_spent_seconds?: number | null
          time_started?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_time_tracking_student_exercise_id_fkey"
            columns: ["student_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exercises: {
        Row: {
          class_session_id: string
          completed_at: string | null
          created_at: string
          exercise_data: Json
          id: string
          score: number | null
          skill_name: string
          skill_score: number
          started_at: string | null
          status: string
          student_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          class_session_id: string
          completed_at?: string | null
          created_at?: string
          exercise_data: Json
          id?: string
          score?: number | null
          skill_name: string
          skill_score: number
          started_at?: string | null
          status?: string
          student_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          class_session_id?: string
          completed_at?: string | null
          created_at?: string
          exercise_data?: Json
          id?: string
          score?: number | null
          skill_name?: string
          skill_score?: number
          started_at?: string | null
          status?: string
          student_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_exercises_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_links: {
        Row: {
          class_id: string | null
          created_at: string
          current_attempts: number
          description: string | null
          exam_id: string | null
          expires_at: string
          id: string
          is_active: boolean
          link_type: string
          max_attempts: number
          student_name: string | null
          teacher_name: string
          title: string
          token: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          current_attempts?: number
          description?: string | null
          exam_id?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          link_type: string
          max_attempts?: number
          student_name?: string | null
          teacher_name: string
          title: string
          token: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          current_attempts?: number
          description?: string | null
          exam_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          link_type?: string
          max_attempts?: number
          student_name?: string | null
          teacher_name?: string
          title?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_links_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          student_id: string | null
          student_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          student_id?: string | null
          student_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          student_id?: string | null
          student_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_quiz_sessions: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          current_question: number
          id: string
          is_submitted: boolean
          started_at: string
          student_link_id: string
          student_name: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          current_question?: number
          id?: string
          is_submitted?: boolean
          started_at?: string
          student_link_id: string
          student_name: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          current_question?: number
          id?: string
          is_submitted?: boolean
          started_at?: string
          student_link_id?: string
          student_name?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_quiz_sessions_student_link_id_fkey"
            columns: ["student_link_id"]
            isOneToOne: false
            referencedRelation: "student_links"
            referencedColumns: ["id"]
          },
        ]
      }
      student_upload_sessions: {
        Row: {
          analysis_results: Json | null
          completed_at: string | null
          created_at: string
          id: string
          overall_score: number | null
          student_link_id: string
          student_name: string
          updated_at: string
          uploaded_files: Json
        }
        Insert: {
          analysis_results?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_score?: number | null
          student_link_id: string
          student_name: string
          updated_at?: string
          uploaded_files?: Json
        }
        Update: {
          analysis_results?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_score?: number | null
          student_link_id?: string
          student_name?: string
          updated_at?: string
          uploaded_files?: Json
        }
        Relationships: [
          {
            foreignKeyName: "student_upload_sessions_student_link_id_fkey"
            columns: ["student_link_id"]
            isOneToOne: false
            referencedRelation: "student_links"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_skill_scores: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          points_possible: number
          practice_exercise_id: string | null
          score: number
          skill_name: string
          test_result_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned: number
          points_possible: number
          practice_exercise_id?: string | null
          score: number
          skill_name: string
          test_result_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          points_possible?: number
          practice_exercise_id?: string | null
          score?: number
          skill_name?: string
          test_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_skill_scores_practice_exercise_id_fkey"
            columns: ["practice_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_skill_scores_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_skills: {
        Row: {
          created_at: string
          grade: string
          id: string
          skill_description: string
          skill_name: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string
          id?: string
          skill_description: string
          skill_name: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          skill_description?: string
          skill_name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          active_student_id: string | null
          ai_feedback: string | null
          class_id: string
          created_at: string
          detailed_analysis: string | null
          exam_id: string
          id: string
          overall_score: number
          student_id: string
          total_points_earned: number
          total_points_possible: number
        }
        Insert: {
          active_student_id?: string | null
          ai_feedback?: string | null
          class_id: string
          created_at?: string
          detailed_analysis?: string | null
          exam_id: string
          id?: string
          overall_score: number
          student_id: string
          total_points_earned: number
          total_points_possible: number
        }
        Update: {
          active_student_id?: string | null
          ai_feedback?: string | null
          class_id?: string
          created_at?: string
          detailed_analysis?: string | null
          exam_id?: string
          id?: string
          overall_score?: number
          student_id?: string
          total_points_earned?: number
          total_points_possible?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_results_active_student_id_fkey"
            columns: ["active_student_id"]
            isOneToOne: false
            referencedRelation: "active_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_logs: {
        Row: {
          error_details: Json | null
          error_message: string | null
          id: string
          input_size_bytes: number | null
          model_used: string | null
          operation_type: string
          processing_time_ms: number | null
          retry_count: number | null
          schema_version: string | null
          session_id: string | null
          success: boolean
          temperature: number | null
          timestamp: string
          user_context: Json | null
          validation_type: string
        }
        Insert: {
          error_details?: Json | null
          error_message?: string | null
          id?: string
          input_size_bytes?: number | null
          model_used?: string | null
          operation_type: string
          processing_time_ms?: number | null
          retry_count?: number | null
          schema_version?: string | null
          session_id?: string | null
          success: boolean
          temperature?: number | null
          timestamp?: string
          user_context?: Json | null
          validation_type: string
        }
        Update: {
          error_details?: Json | null
          error_message?: string | null
          id?: string
          input_size_bytes?: number | null
          model_used?: string | null
          operation_type?: string
          processing_time_ms?: number | null
          retry_count?: number | null
          schema_version?: string | null
          session_id?: string | null
          success?: boolean
          temperature?: number | null
          timestamp?: string
          user_context?: Json | null
          validation_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_updated_skill_score: {
        Args: {
          current_score: number
          new_score: number
          current_attempts: number
          recency_weight?: number
        }
        Returns: number
      }
      get_question_timing_analytics: {
        Args: { student_uuid: string }
        Returns: {
          skill_name: string
          avg_time_per_question: number
          min_time_seconds: number
          max_time_seconds: number
          total_questions: number
          questions_with_multiple_changes: number
        }[]
      }
      get_session_monitoring_data: {
        Args: { session_id?: string }
        Returns: {
          id: string
          class_session_id: string
          student_id: string
          student_name: string
          skill_name: string
          original_skill_score: number
          status: string
          exercise_score: number
          started_at: string
          completed_at: string
          created_at: string
          updated_at: string
          session_name: string
          teacher_id: string
          class_id: string
          is_active: boolean
          lesson_plan_id: string
          class_name: string
          subject: string
          grade: string
        }[]
      }
      get_struggle_indicators: {
        Args: { student_uuid: string; time_threshold_seconds?: number }
        Returns: {
          skill_name: string
          question_number: number
          time_spent_seconds: number
          answer_changes_count: number
          was_correct: boolean
          struggle_score: number
        }[]
      }
      get_student_current_skill_scores: {
        Args: { student_uuid: string }
        Returns: {
          skill_name: string
          skill_type: string
          current_score: number
          attempts_count: number
          last_updated: string
        }[]
      }
      get_student_mistake_patterns: {
        Args: { student_uuid: string; skill_filter?: string }
        Returns: {
          skill_name: string
          mistake_type: string
          mistake_count: number
          total_questions: number
          mistake_rate: number
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["teacher", "student"],
    },
  },
} as const
