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
          day_of_week: string[] | null
          end_time: string | null
          grade: string
          id: string
          name: string
          student_count: number | null
          students: string[] | null
          subject: string
          teacher: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          avg_gpa?: number | null
          class_time?: string | null
          created_at?: string
          day_of_week?: string[] | null
          end_time?: string | null
          grade: string
          id?: string
          name: string
          student_count?: number | null
          students?: string[] | null
          subject: string
          teacher: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_gpa?: number | null
          class_time?: string | null
          created_at?: string
          day_of_week?: string[] | null
          end_time?: string | null
          grade?: string
          id?: string
          name?: string
          student_count?: number | null
          students?: string[] | null
          subject?: string
          teacher?: string
          teacher_id?: string | null
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
      adaptive_learning_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          session_context: string | null
          skill_context: string | null
          student_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          session_context?: string | null
          skill_context?: string | null
          student_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          session_context?: string | null
          skill_context?: string | null
          student_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      adaptive_learning_profiles: {
        Row: {
          cognitive_load_tolerance: string | null
          confidence_trend: string | null
          created_at: string | null
          engagement_score: number | null
          fatigue_threshold_minutes: number | null
          help_seeking_frequency: string | null
          id: string
          learning_modality: string | null
          learning_velocity: number | null
          mistake_recovery_style: string | null
          optimal_difficulty_progression: string | null
          optimal_session_length_minutes: number | null
          preferred_explanation_style: string | null
          scaffolding_preferences: Json | null
          student_id: string
          updated_at: string | null
          zone_of_proximal_development: Json | null
        }
        Insert: {
          cognitive_load_tolerance?: string | null
          confidence_trend?: string | null
          created_at?: string | null
          engagement_score?: number | null
          fatigue_threshold_minutes?: number | null
          help_seeking_frequency?: string | null
          id?: string
          learning_modality?: string | null
          learning_velocity?: number | null
          mistake_recovery_style?: string | null
          optimal_difficulty_progression?: string | null
          optimal_session_length_minutes?: number | null
          preferred_explanation_style?: string | null
          scaffolding_preferences?: Json | null
          student_id: string
          updated_at?: string | null
          zone_of_proximal_development?: Json | null
        }
        Update: {
          cognitive_load_tolerance?: string | null
          confidence_trend?: string | null
          created_at?: string | null
          engagement_score?: number | null
          fatigue_threshold_minutes?: number | null
          help_seeking_frequency?: string | null
          id?: string
          learning_modality?: string | null
          learning_velocity?: number | null
          mistake_recovery_style?: string | null
          optimal_difficulty_progression?: string | null
          optimal_session_length_minutes?: number | null
          preferred_explanation_style?: string | null
          scaffolding_preferences?: Json | null
          student_id?: string
          updated_at?: string | null
          zone_of_proximal_development?: Json | null
        }
        Relationships: []
      }
      adaptive_recommendations_log: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          current_confidence: number | null
          current_performance: number | null
          effectiveness_score: number | null
          id: string
          implementation_timestamp: string | null
          rationale: string
          recommendation_data: Json
          recommendation_type: string
          skill_context: string
          student_id: string
          student_response: string | null
          trigger_event: string
          was_implemented: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          current_confidence?: number | null
          current_performance?: number | null
          effectiveness_score?: number | null
          id?: string
          implementation_timestamp?: string | null
          rationale: string
          recommendation_data: Json
          recommendation_type: string
          skill_context: string
          student_id: string
          student_response?: string | null
          trigger_event: string
          was_implemented?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          current_confidence?: number | null
          current_performance?: number | null
          effectiveness_score?: number | null
          id?: string
          implementation_timestamp?: string | null
          rationale?: string
          recommendation_data?: Json
          recommendation_type?: string
          skill_context?: string
          student_id?: string
          student_response?: string | null
          trigger_event?: string
          was_implemented?: boolean | null
        }
        Relationships: []
      }
      affective_response_flags: {
        Row: {
          behavioral_data: Json | null
          detected_at: string | null
          exam_id: string | null
          flag_type: string
          id: string
          intensity_score: number | null
          notes: string | null
          question_id: string | null
          student_id: string
        }
        Insert: {
          behavioral_data?: Json | null
          detected_at?: string | null
          exam_id?: string | null
          flag_type: string
          id?: string
          intensity_score?: number | null
          notes?: string | null
          question_id?: string | null
          student_id: string
        }
        Update: {
          behavioral_data?: Json | null
          detected_at?: string | null
          exam_id?: string | null
          flag_type?: string
          id?: string
          intensity_score?: number | null
          notes?: string | null
          question_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affective_response_flags_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
          },
          {
            foreignKeyName: "affective_response_flags_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_personality: {
        Row: {
          created_at: string | null
          difficulty_preference: string | null
          learning_style: string | null
          preferred_tone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty_preference?: string | null
          learning_style?: string | null
          preferred_tone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          difficulty_preference?: string | null
          learning_style?: string | null
          preferred_tone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      answer_keys: {
        Row: {
          acceptable_answers: Json | null
          choice_misconceptions: Json | null
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
          choice_misconceptions?: Json | null
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
          choice_misconceptions?: Json | null
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
      api_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          request_count: number | null
          service_name: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_count?: number | null
          service_name: string
          window_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_count?: number | null
          service_name?: string
          window_start?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
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
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string
          enrolled_at: string
          enrolled_by: string | null
          id: string
          is_active: boolean
          student_profile_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          is_active?: boolean
          student_profile_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          is_active?: boolean
          student_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "class_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "class_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "class_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
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
      concept_index: {
        Row: {
          concept_name: string
          created_at: string
          description: string | null
          grade: string
          id: string
          keywords: string[] | null
          related_skills: string[] | null
          subject: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          concept_name: string
          created_at?: string
          description?: string | null
          grade: string
          id?: string
          keywords?: string[] | null
          related_skills?: string[] | null
          subject: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          concept_name?: string
          created_at?: string
          description?: string | null
          grade?: string
          id?: string
          keywords?: string[] | null
          related_skills?: string[] | null
          subject?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      content_skill_scores: {
        Row: {
          authenticated_student_id: string | null
          created_at: string
          id: string
          points_earned: number
          points_possible: number
          practice_exercise_id: string | null
          score: number
          skill_name: string
          student_id: string | null
          test_result_id: string | null
        }
        Insert: {
          authenticated_student_id?: string | null
          created_at?: string
          id?: string
          points_earned: number
          points_possible: number
          practice_exercise_id?: string | null
          score: number
          skill_name: string
          student_id?: string | null
          test_result_id?: string | null
        }
        Update: {
          authenticated_student_id?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          points_possible?: number
          practice_exercise_id?: string | null
          score?: number
          skill_name?: string
          student_id?: string | null
          test_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_skill_scores_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_skill_scores_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_skill_scores_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_skill_scores_practice_exercise_id_fkey"
            columns: ["practice_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_skill_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
          },
          {
            foreignKeyName: "content_skill_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
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
      conversation_analytics: {
        Row: {
          ai_responses: number | null
          breakthrough_indicators: number | null
          concepts_clarified: string[] | null
          confusion_indicators: number | null
          conversation_id: string
          created_at: string | null
          difficulty_adjustments_made: number | null
          explanation_styles_used: string[] | null
          help_requests: number | null
          id: string
          learning_objectives_achieved: boolean | null
          misconceptions_addressed: string[] | null
          session_duration_minutes: number | null
          skills_practiced: string[] | null
          student_id: string
          student_messages: number | null
          student_satisfaction_score: number | null
          topic_changes: number | null
          total_messages: number | null
          updated_at: string | null
        }
        Insert: {
          ai_responses?: number | null
          breakthrough_indicators?: number | null
          concepts_clarified?: string[] | null
          confusion_indicators?: number | null
          conversation_id: string
          created_at?: string | null
          difficulty_adjustments_made?: number | null
          explanation_styles_used?: string[] | null
          help_requests?: number | null
          id?: string
          learning_objectives_achieved?: boolean | null
          misconceptions_addressed?: string[] | null
          session_duration_minutes?: number | null
          skills_practiced?: string[] | null
          student_id: string
          student_messages?: number | null
          student_satisfaction_score?: number | null
          topic_changes?: number | null
          total_messages?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_responses?: number | null
          breakthrough_indicators?: number | null
          concepts_clarified?: string[] | null
          confusion_indicators?: number | null
          conversation_id?: string
          created_at?: string | null
          difficulty_adjustments_made?: number | null
          explanation_styles_used?: string[] | null
          help_requests?: number | null
          id?: string
          learning_objectives_achieved?: boolean | null
          misconceptions_addressed?: string[] | null
          session_duration_minutes?: number | null
          skills_practiced?: string[] | null
          student_id?: string
          student_messages?: number | null
          student_satisfaction_score?: number | null
          topic_changes?: number | null
          total_messages?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_prompt_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          generated_at: string | null
          generated_prompt: string
          prompt_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generated_prompt: string
          prompt_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generated_prompt?: string
          prompt_type?: string
          user_id?: string
        }
        Relationships: []
      }
      error_pattern_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          pattern_id: string
          pattern_name: string
          related_patterns: string[] | null
          remediation_strategies: string[] | null
          severity_indicators: Json | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          pattern_id: string
          pattern_name: string
          related_patterns?: string[] | null
          remediation_strategies?: string[] | null
          severity_indicators?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          pattern_id?: string
          pattern_name?: string
          related_patterns?: string[] | null
          remediation_strategies?: string[] | null
          severity_indicators?: Json | null
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
      escalation_outcomes: {
        Row: {
          ambiguity_description: string
          context: Json | null
          cost_impact: number | null
          created_at: string
          escalation_type: string
          exam_id: string | null
          fallback_path: string | null
          final_confidence: number | null
          id: string
          metadata: Json | null
          models_used: string[] | null
          original_confidence: number | null
          original_service: string
          processing_time_ms: number | null
          quality_score: number | null
          question_id: string | null
          selected_solution: string
          session_id: string | null
          student_id: string | null
          success: boolean | null
          updated_at: string
        }
        Insert: {
          ambiguity_description: string
          context?: Json | null
          cost_impact?: number | null
          created_at?: string
          escalation_type: string
          exam_id?: string | null
          fallback_path?: string | null
          final_confidence?: number | null
          id?: string
          metadata?: Json | null
          models_used?: string[] | null
          original_confidence?: number | null
          original_service: string
          processing_time_ms?: number | null
          quality_score?: number | null
          question_id?: string | null
          selected_solution: string
          session_id?: string | null
          student_id?: string | null
          success?: boolean | null
          updated_at?: string
        }
        Update: {
          ambiguity_description?: string
          context?: Json | null
          cost_impact?: number | null
          created_at?: string
          escalation_type?: string
          exam_id?: string | null
          fallback_path?: string | null
          final_confidence?: number | null
          id?: string
          metadata?: Json | null
          models_used?: string[] | null
          original_confidence?: number | null
          original_service?: string
          processing_time_ms?: number | null
          quality_score?: number | null
          question_id?: string | null
          selected_solution?: string
          session_id?: string | null
          student_id?: string | null
          success?: boolean | null
          updated_at?: string
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
          auto_created_skill: boolean | null
          concept_missed_short: string | null
          confidence: number
          created_at: string
          creation_confidence: number | null
          exam_id: string
          id: string
          question_number: number
          skill_id: string
          skill_name: string
          skill_type: string
          skill_weight: number
          suggested_skill_description: string | null
          suggested_skill_name: string | null
          updated_at: string
        }
        Insert: {
          auto_created_skill?: boolean | null
          concept_missed_short?: string | null
          confidence?: number
          created_at?: string
          creation_confidence?: number | null
          exam_id: string
          id?: string
          question_number: number
          skill_id: string
          skill_name: string
          skill_type: string
          skill_weight?: number
          suggested_skill_description?: string | null
          suggested_skill_name?: string | null
          updated_at?: string
        }
        Update: {
          auto_created_skill?: boolean | null
          concept_missed_short?: string | null
          confidence?: number
          created_at?: string
          creation_confidence?: number | null
          exam_id?: string
          id?: string
          question_number?: number
          skill_id?: string
          skill_name?: string
          skill_type?: string
          skill_weight?: number
          suggested_skill_description?: string | null
          suggested_skill_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exam_skill_rationales: {
        Row: {
          created_at: string
          difficulty_analysis: string | null
          exam_id: string
          id: string
          pedagogical_reasoning: string | null
          prerequisite_gaps: string[] | null
          question_number: number
          rationale: string
          skill_id: string
          skill_name: string
          skill_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty_analysis?: string | null
          exam_id: string
          id?: string
          pedagogical_reasoning?: string | null
          prerequisite_gaps?: string[] | null
          question_number: number
          rationale: string
          skill_id: string
          skill_name: string
          skill_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty_analysis?: string | null
          exam_id?: string
          id?: string
          pedagogical_reasoning?: string | null
          prerequisite_gaps?: string[] | null
          question_number?: number
          rationale?: string
          skill_id?: string
          skill_name?: string
          skill_type?: string
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
      file_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_group_data: Json
          id: string
          max_retries: number
          priority: string
          processing_time_ms: number | null
          result_json: Json | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_group_data: Json
          id?: string
          max_retries?: number
          priority?: string
          processing_time_ms?: number | null
          result_json?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_group_data?: Json
          id?: string
          max_retries?: number
          priority?: string
          processing_time_ms?: number | null
          result_json?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      goal_achievements: {
        Row: {
          achieved_at: string | null
          achievement_description: string | null
          achievement_title: string
          achievement_type: string
          celebration_shown: boolean | null
          created_at: string | null
          goal_id: string
          id: string
          progress_snapshot: Json | null
          student_id: string
          value_achieved: number | null
        }
        Insert: {
          achieved_at?: string | null
          achievement_description?: string | null
          achievement_title: string
          achievement_type: string
          celebration_shown?: boolean | null
          created_at?: string | null
          goal_id: string
          id?: string
          progress_snapshot?: Json | null
          student_id: string
          value_achieved?: number | null
        }
        Update: {
          achieved_at?: string | null
          achievement_description?: string | null
          achievement_title?: string
          achievement_type?: string
          celebration_shown?: boolean | null
          created_at?: string | null
          goal_id?: string
          id?: string
          progress_snapshot?: Json | null
          student_id?: string
          value_achieved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "student_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_history: {
        Row: {
          achieved: boolean | null
          achieved_score: number | null
          concept: string
          created_at: string | null
          goal_type: string
          id: string
          session_id: string | null
          submitted_at: string | null
          target_score: number | null
          user_id: string | null
        }
        Insert: {
          achieved?: boolean | null
          achieved_score?: number | null
          concept: string
          created_at?: string | null
          goal_type: string
          id?: string
          session_id?: string | null
          submitted_at?: string | null
          target_score?: number | null
          user_id?: string | null
        }
        Update: {
          achieved?: boolean | null
          achieved_score?: number | null
          concept?: string
          created_at?: string | null
          goal_type?: string
          id?: string
          session_id?: string | null
          submitted_at?: string | null
          target_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trailblazer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_recommendations_log: {
        Row: {
          created_at: string | null
          effectiveness_score: number | null
          goals_accepted: number | null
          goals_completed: number | null
          id: string
          misconception_data: Json | null
          recommendation_reasoning: string | null
          recommended_goals: Json
          student_id: string
          student_performance_data: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          effectiveness_score?: number | null
          goals_accepted?: number | null
          goals_completed?: number | null
          id?: string
          misconception_data?: Json | null
          recommendation_reasoning?: string | null
          recommended_goals: Json
          student_id: string
          student_performance_data: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          effectiveness_score?: number | null
          goals_accepted?: number | null
          goals_completed?: number | null
          id?: string
          misconception_data?: Json | null
          recommendation_reasoning?: string | null
          recommended_goals?: Json
          student_id?: string
          student_performance_data?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      grading_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string | null
          max_retries: number | null
          payload: Json
          priority: string | null
          processing_time_ms: number | null
          result_payload: Json | null
          retries: number | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          max_retries?: number | null
          payload: Json
          priority?: string | null
          processing_time_ms?: number | null
          result_payload?: Json | null
          retries?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          max_retries?: number | null
          payload?: Json
          priority?: string | null
          processing_time_ms?: number | null
          result_payload?: Json | null
          retries?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      job_failures: {
        Row: {
          context: Json | null
          error_message: string | null
          error_type: string
          failed_at: string | null
          id: string
          job_id: string | null
          retry_attempt: number | null
          stack_trace: string | null
        }
        Insert: {
          context?: Json | null
          error_message?: string | null
          error_type: string
          failed_at?: string | null
          id?: string
          job_id?: string | null
          retry_attempt?: number | null
          stack_trace?: string | null
        }
        Update: {
          context?: Json | null
          error_message?: string | null
          error_type?: string
          failed_at?: string | null
          id?: string
          job_id?: string | null
          retry_attempt?: number | null
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_failures_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "grading_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_payloads: {
        Row: {
          created_at: string | null
          errors_data: Json | null
          files_data: Json | null
          job_id: string
          request_metadata: Json | null
          results_data: Json | null
        }
        Insert: {
          created_at?: string | null
          errors_data?: Json | null
          files_data?: Json | null
          job_id: string
          request_metadata?: Json | null
          results_data?: Json | null
        }
        Update: {
          created_at?: string | null
          errors_data?: Json | null
          files_data?: Json | null
          job_id?: string
          request_metadata?: Json | null
          results_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_payloads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
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
      learning_delta_log: {
        Row: {
          concept: string
          final_score: number | null
          id: string
          improvement: number | null
          initial_score: number | null
          logged_at: string | null
          mistake_types_fixed: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          concept: string
          final_score?: number | null
          id?: string
          improvement?: number | null
          initial_score?: number | null
          logged_at?: string | null
          mistake_types_fixed?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          concept?: string
          final_score?: number | null
          id?: string
          improvement?: number | null
          initial_score?: number | null
          logged_at?: string | null
          mistake_types_fixed?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_delta_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trailblazer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_trajectory_events: {
        Row: {
          behavioral_signals: Json | null
          confidence_after: number | null
          confidence_before: number | null
          created_at: string | null
          difficulty_level: string
          event_type: string
          explanation_attempts_count: number | null
          help_requests_count: number | null
          id: string
          intervention_triggered: boolean | null
          performance_after: number | null
          performance_before: number | null
          question_context: Json | null
          session_id: string | null
          skill_name: string
          skill_type: string
          student_id: string
          successful_explanation_type: string | null
          time_to_resolution_seconds: number | null
        }
        Insert: {
          behavioral_signals?: Json | null
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string | null
          difficulty_level: string
          event_type: string
          explanation_attempts_count?: number | null
          help_requests_count?: number | null
          id?: string
          intervention_triggered?: boolean | null
          performance_after?: number | null
          performance_before?: number | null
          question_context?: Json | null
          session_id?: string | null
          skill_name: string
          skill_type: string
          student_id: string
          successful_explanation_type?: string | null
          time_to_resolution_seconds?: number | null
        }
        Update: {
          behavioral_signals?: Json | null
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string | null
          difficulty_level?: string
          event_type?: string
          explanation_attempts_count?: number | null
          help_requests_count?: number | null
          id?: string
          intervention_triggered?: boolean | null
          performance_after?: number | null
          performance_before?: number | null
          question_context?: Json | null
          session_id?: string | null
          skill_name?: string
          skill_type?: string
          student_id?: string
          successful_explanation_type?: string | null
          time_to_resolution_seconds?: number | null
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
      mini_lesson_requests: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          mini_lesson_id: string | null
          misconception_subtype_id: string
          request_context: Json | null
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          mini_lesson_id?: string | null
          misconception_subtype_id: string
          request_context?: Json | null
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          mini_lesson_id?: string | null
          misconception_subtype_id?: string
          request_context?: Json | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_lesson_requests_mini_lesson_id_fkey"
            columns: ["mini_lesson_id"]
            isOneToOne: false
            referencedRelation: "mini_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_lesson_requests_misconception_subtype_id_fkey"
            columns: ["misconception_subtype_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_lessons: {
        Row: {
          created_at: string
          difficulty_level: string | null
          effectiveness_score: number | null
          generated_at: string
          generation_context: Json | null
          id: string
          last_viewed_at: string | null
          lesson_content: string
          misconception_subtype_id: string
          student_id: string | null
          triggered_by: string | null
          updated_at: string
          viewed_count: number | null
        }
        Insert: {
          created_at?: string
          difficulty_level?: string | null
          effectiveness_score?: number | null
          generated_at?: string
          generation_context?: Json | null
          id?: string
          last_viewed_at?: string | null
          lesson_content: string
          misconception_subtype_id: string
          student_id?: string | null
          triggered_by?: string | null
          updated_at?: string
          viewed_count?: number | null
        }
        Update: {
          created_at?: string
          difficulty_level?: string | null
          effectiveness_score?: number | null
          generated_at?: string
          generation_context?: Json | null
          id?: string
          last_viewed_at?: string | null
          lesson_content?: string
          misconception_subtype_id?: string
          student_id?: string | null
          triggered_by?: string | null
          updated_at?: string
          viewed_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_lessons_misconception_subtype_id_fkey"
            columns: ["misconception_subtype_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
            referencedColumns: ["id"]
          },
        ]
      }
      misconception_categories: {
        Row: {
          category_name: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      misconception_feedback_sessions: {
        Row: {
          created_at: string | null
          feedback_type: string
          id: string
          intervention_data: Json | null
          notes: string | null
          student_misconception_id: string
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          feedback_type: string
          id?: string
          intervention_data?: Json | null
          notes?: string | null
          student_misconception_id: string
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          feedback_type?: string
          id?: string
          intervention_data?: Json | null
          notes?: string | null
          student_misconception_id?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "misconception_feedback_sessions_student_misconception_id_fkey"
            columns: ["student_misconception_id"]
            isOneToOne: false
            referencedRelation: "student_misconceptions"
            referencedColumns: ["id"]
          },
        ]
      }
      misconception_persistence_logs: {
        Row: {
          created_at: string | null
          first_detected_at: string | null
          id: string
          last_detected_at: string | null
          misconception_subtype_id: string
          resolution_date: string | null
          resolved: boolean | null
          student_id: string
          total_occurrences: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_detected_at?: string | null
          id?: string
          last_detected_at?: string | null
          misconception_subtype_id: string
          resolution_date?: string | null
          resolved?: boolean | null
          student_id: string
          total_occurrences?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_detected_at?: string | null
          id?: string
          last_detected_at?: string | null
          misconception_subtype_id?: string
          resolution_date?: string | null
          resolved?: boolean | null
          student_id?: string
          total_occurrences?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misconception_persistence_logs_misconception_subtype_id_fkey"
            columns: ["misconception_subtype_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "misconception_persistence_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
          },
          {
            foreignKeyName: "misconception_persistence_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      misconception_subtypes: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          subtype_name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          subtype_name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          subtype_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misconception_subtypes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "misconception_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mistake_patterns: {
        Row: {
          cognitive_load_indicators: Json | null
          concept_confidence: number | null
          concept_mastery_level: string | null
          concept_missed_description: string | null
          concept_missed_id: string | null
          concept_source: string | null
          confidence_score: number | null
          context_when_error_occurred: Json | null
          correct_answer: string
          created_at: string
          detailed_conceptual_error: string | null
          difficulty_level_appropriate: boolean | null
          distractor_analysis: string | null
          error_pattern_id: string | null
          error_persistence_count: number | null
          error_severity: string | null
          expected_concept: string | null
          feedback_given: string | null
          gpt_analysis_metadata: Json | null
          grading_method: string | null
          id: string
          instructional_sensitivity_flag: boolean | null
          is_correct: boolean
          learning_objectives: string[] | null
          metacognitive_awareness: string | null
          misconception_category: string | null
          misconception_signature: string | null
          mistake_type: string | null
          prerequisite_skills_gap: string[] | null
          question_context: string | null
          question_id: string
          question_number: number
          question_type: string | null
          related_concepts: string[] | null
          remediation_suggestions: string | null
          skill_targeted: string
          solution_path: string | null
          student_answer: string
          student_exercise_id: string
          teacher_override_concept_id: string | null
          teacher_override_reason: string | null
          teacher_validated: boolean | null
          teacher_validation_timestamp: string | null
          transfer_failure_indicator: boolean | null
        }
        Insert: {
          cognitive_load_indicators?: Json | null
          concept_confidence?: number | null
          concept_mastery_level?: string | null
          concept_missed_description?: string | null
          concept_missed_id?: string | null
          concept_source?: string | null
          confidence_score?: number | null
          context_when_error_occurred?: Json | null
          correct_answer: string
          created_at?: string
          detailed_conceptual_error?: string | null
          difficulty_level_appropriate?: boolean | null
          distractor_analysis?: string | null
          error_pattern_id?: string | null
          error_persistence_count?: number | null
          error_severity?: string | null
          expected_concept?: string | null
          feedback_given?: string | null
          gpt_analysis_metadata?: Json | null
          grading_method?: string | null
          id?: string
          instructional_sensitivity_flag?: boolean | null
          is_correct: boolean
          learning_objectives?: string[] | null
          metacognitive_awareness?: string | null
          misconception_category?: string | null
          misconception_signature?: string | null
          mistake_type?: string | null
          prerequisite_skills_gap?: string[] | null
          question_context?: string | null
          question_id: string
          question_number: number
          question_type?: string | null
          related_concepts?: string[] | null
          remediation_suggestions?: string | null
          skill_targeted: string
          solution_path?: string | null
          student_answer: string
          student_exercise_id: string
          teacher_override_concept_id?: string | null
          teacher_override_reason?: string | null
          teacher_validated?: boolean | null
          teacher_validation_timestamp?: string | null
          transfer_failure_indicator?: boolean | null
        }
        Update: {
          cognitive_load_indicators?: Json | null
          concept_confidence?: number | null
          concept_mastery_level?: string | null
          concept_missed_description?: string | null
          concept_missed_id?: string | null
          concept_source?: string | null
          confidence_score?: number | null
          context_when_error_occurred?: Json | null
          correct_answer?: string
          created_at?: string
          detailed_conceptual_error?: string | null
          difficulty_level_appropriate?: boolean | null
          distractor_analysis?: string | null
          error_pattern_id?: string | null
          error_persistence_count?: number | null
          error_severity?: string | null
          expected_concept?: string | null
          feedback_given?: string | null
          gpt_analysis_metadata?: Json | null
          grading_method?: string | null
          id?: string
          instructional_sensitivity_flag?: boolean | null
          is_correct?: boolean
          learning_objectives?: string[] | null
          metacognitive_awareness?: string | null
          misconception_category?: string | null
          misconception_signature?: string | null
          mistake_type?: string | null
          prerequisite_skills_gap?: string[] | null
          question_context?: string | null
          question_id?: string
          question_number?: number
          question_type?: string | null
          related_concepts?: string[] | null
          remediation_suggestions?: string | null
          skill_targeted?: string
          solution_path?: string | null
          student_answer?: string
          student_exercise_id?: string
          teacher_override_concept_id?: string | null
          teacher_override_reason?: string | null
          teacher_validated?: boolean | null
          teacher_validation_timestamp?: string | null
          transfer_failure_indicator?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mistake_patterns_concept_missed_id_fkey"
            columns: ["concept_missed_id"]
            isOneToOne: false
            referencedRelation: "concept_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_patterns_student_exercise_id_fkey"
            columns: ["student_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_patterns_teacher_override_concept_id_fkey"
            columns: ["teacher_override_concept_id"]
            isOneToOne: false
            referencedRelation: "concept_index"
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
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
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
          choice_misconceptions: Json | null
          created_at: string
          exercise_id: string
          id: string
          metadata: Json | null
          questions: Json
          updated_at: string
        }
        Insert: {
          choice_misconceptions?: Json | null
          created_at?: string
          exercise_id: string
          id?: string
          metadata?: Json | null
          questions?: Json
          updated_at?: string
        }
        Update: {
          choice_misconceptions?: Json | null
          created_at?: string
          exercise_id?: string
          id?: string
          metadata?: Json | null
          questions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      predictive_misconception_alerts: {
        Row: {
          behavioral_signals: Json | null
          confidence_score: number
          created_at: string
          exam_id: string | null
          exercise_id: string | null
          id: string
          predicted_misconception_subtype_id: string | null
          question_id: string
          resolution_type: string | null
          resolved: boolean | null
          resolved_at: string | null
          risk_level: string | null
          student_id: string
        }
        Insert: {
          behavioral_signals?: Json | null
          confidence_score?: number
          created_at?: string
          exam_id?: string | null
          exercise_id?: string | null
          id?: string
          predicted_misconception_subtype_id?: string | null
          question_id: string
          resolution_type?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          risk_level?: string | null
          student_id: string
        }
        Update: {
          behavioral_signals?: Json | null
          confidence_score?: number
          created_at?: string
          exam_id?: string | null
          exercise_id?: string | null
          id?: string
          predicted_misconception_subtype_id?: string | null
          question_id?: string
          resolution_type?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          risk_level?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_misconception_aler_predicted_misconception_subt_fkey"
            columns: ["predicted_misconception_subtype_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_teacher_id: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_teacher_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_teacher_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_metrics: {
        Row: {
          accuracy: number | null
          attempts_count: number | null
          confidence_score: number | null
          created_at: string | null
          id: string
          misconception_detected: boolean | null
          misconception_subtype_id: string | null
          session_id: string | null
          session_type: string
          skill_name: string
          skill_type: string
          student_id: string
          time_spent_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          attempts_count?: number | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          misconception_detected?: boolean | null
          misconception_subtype_id?: string | null
          session_id?: string | null
          session_type?: string
          skill_name: string
          skill_type?: string
          student_id: string
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          attempts_count?: number | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          misconception_detected?: boolean | null
          misconception_subtype_id?: string | null
          session_id?: string | null
          session_type?: string
          skill_name?: string
          skill_type?: string
          student_id?: string
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_metrics_misconception_subtype_id_fkey"
            columns: ["misconception_subtype_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
            referencedColumns: ["id"]
          },
        ]
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
      skill_auto_creation_log: {
        Row: {
          auto_created_at: string
          class_id: string
          confidence: number
          context_data: Json | null
          created_at: string
          exam_id: string
          id: string
          reasoning: string
          skill_description: string
          skill_id: string
          skill_name: string
          skill_type: string
        }
        Insert: {
          auto_created_at?: string
          class_id: string
          confidence: number
          context_data?: Json | null
          created_at?: string
          exam_id: string
          id?: string
          reasoning: string
          skill_description: string
          skill_id: string
          skill_name: string
          skill_type: string
        }
        Update: {
          auto_created_at?: string
          class_id?: string
          confidence?: number
          context_data?: Json | null
          created_at?: string
          exam_id?: string
          id?: string
          reasoning?: string
          skill_description?: string
          skill_id?: string
          skill_name?: string
          skill_type?: string
        }
        Relationships: []
      }
      skill_review_queue: {
        Row: {
          class_id: string
          confidence: number
          context_evidence: string
          created_at: string
          created_skill_id: string | null
          created_skill_type: string | null
          exam_id: string
          grade: string
          id: string
          reasoning: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skill_description: string
          skill_name: string
          skill_type: string
          status: string
          subject: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          confidence: number
          context_evidence: string
          created_at?: string
          created_skill_id?: string | null
          created_skill_type?: string | null
          exam_id: string
          grade: string
          id?: string
          reasoning: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_description: string
          skill_name: string
          skill_type: string
          status?: string
          subject: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          confidence?: number
          context_evidence?: string
          created_at?: string
          created_skill_id?: string | null
          created_skill_type?: string | null
          exam_id?: string
          grade?: string
          id?: string
          reasoning?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_description?: string
          skill_name?: string
          skill_type?: string
          status?: string
          subject?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_action_logs: {
        Row: {
          action_type: string
          context_summary: Json | null
          created_at: string
          id: string
          reference_id: string | null
          reference_table: string | null
          session_type: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          action_type: string
          context_summary?: Json | null
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          session_type?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          context_summary?: Json | null
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          session_type?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_class_enrollments: {
        Row: {
          class_id: string
          created_at: string
          enrolled_at: string
          enrollment_method: string
          id: string
          is_active: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          enrolled_at?: string
          enrollment_method?: string
          id?: string
          is_active?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          enrolled_at?: string
          enrollment_method?: string
          id?: string
          is_active?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
          },
          {
            foreignKeyName: "student_class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
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
      student_goals: {
        Row: {
          ai_confidence_score: number | null
          completed_at: string | null
          context_data: Json | null
          created_at: string | null
          current_value: number | null
          difficulty_level: string | null
          goal_description: string
          goal_title: string
          goal_type: string
          id: string
          is_ai_suggested: boolean | null
          milestones: Json | null
          progress_percentage: number | null
          status: string | null
          student_id: string
          target_date: string | null
          target_misconception_id: string | null
          target_skill_name: string | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          current_value?: number | null
          difficulty_level?: string | null
          goal_description: string
          goal_title: string
          goal_type: string
          id?: string
          is_ai_suggested?: boolean | null
          milestones?: Json | null
          progress_percentage?: number | null
          status?: string | null
          student_id: string
          target_date?: string | null
          target_misconception_id?: string | null
          target_skill_name?: string | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          current_value?: number | null
          difficulty_level?: string | null
          goal_description?: string
          goal_title?: string
          goal_type?: string
          id?: string
          is_ai_suggested?: boolean | null
          milestones?: Json | null
          progress_percentage?: number | null
          status?: string | null
          student_id?: string
          target_date?: string | null
          target_misconception_id?: string | null
          target_skill_name?: string | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_goals_target_misconception_id_fkey"
            columns: ["target_misconception_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
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
      student_misconceptions: {
        Row: {
          confidence_score: number | null
          content_skill_name: string | null
          context_data: Json | null
          corrected: boolean | null
          created_at: string | null
          detected_at: string | null
          exam_id: string | null
          feedback_given: boolean | null
          id: string
          misconception_subtype_id: string
          question_id: string | null
          retry_count: number | null
          skill_id: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          content_skill_name?: string | null
          context_data?: Json | null
          corrected?: boolean | null
          created_at?: string | null
          detected_at?: string | null
          exam_id?: string | null
          feedback_given?: boolean | null
          id?: string
          misconception_subtype_id: string
          question_id?: string | null
          retry_count?: number | null
          skill_id?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          content_skill_name?: string | null
          context_data?: Json | null
          corrected?: boolean | null
          created_at?: string | null
          detected_at?: string | null
          exam_id?: string | null
          feedback_given?: boolean | null
          id?: string
          misconception_subtype_id?: string
          question_id?: string | null
          retry_count?: number | null
          skill_id?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_misconceptions_misconception_subtype_id_fkey"
            columns: ["misconception_subtype_id"]
            isOneToOne: false
            referencedRelation: "misconception_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_misconceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
          },
          {
            foreignKeyName: "student_misconceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_practice_analytics: {
        Row: {
          average_score: number | null
          best_score: number | null
          created_at: string
          id: string
          improvement_rate: number | null
          last_practiced_at: string | null
          skill_name: string
          streak_count: number
          student_id: string
          total_practice_sessions: number
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          created_at?: string
          id?: string
          improvement_rate?: number | null
          last_practiced_at?: string | null
          skill_name: string
          streak_count?: number
          student_id: string
          total_practice_sessions?: number
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          created_at?: string
          id?: string
          improvement_rate?: number | null
          last_practiced_at?: string | null
          skill_name?: string
          streak_count?: number
          student_id?: string
          total_practice_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_practice_sessions: {
        Row: {
          authenticated_student_id: string | null
          class_id: string
          class_name: string
          completed_at: string | null
          created_at: string
          current_skill_score: number
          difficulty_level: string
          exercise_generated: boolean
          final_score: number | null
          grade: string
          id: string
          improvement_shown: number | null
          question_count: number
          skill_name: string
          started_at: string
          student_id: string
          student_name: string
          subject: string
          updated_at: string
        }
        Insert: {
          authenticated_student_id?: string | null
          class_id: string
          class_name: string
          completed_at?: string | null
          created_at?: string
          current_skill_score: number
          difficulty_level?: string
          exercise_generated?: boolean
          final_score?: number | null
          grade: string
          id?: string
          improvement_shown?: number | null
          question_count?: number
          skill_name: string
          started_at?: string
          student_id: string
          student_name: string
          subject: string
          updated_at?: string
        }
        Update: {
          authenticated_student_id?: string | null
          class_id?: string
          class_name?: string
          completed_at?: string | null
          created_at?: string
          current_skill_score?: number
          difficulty_level?: string
          exercise_generated?: boolean
          final_score?: number | null
          grade?: string
          id?: string
          improvement_shown?: number | null
          question_count?: number
          skill_name?: string
          started_at?: string
          student_id?: string
          student_name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_practice_sessions_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_practice_sessions_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_practice_sessions_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          authenticated_user_id: string | null
          created_at: string
          email: string | null
          id: string
          student_id: string | null
          student_name: string
          updated_at: string
        }
        Insert: {
          authenticated_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          student_id?: string | null
          student_name: string
          updated_at?: string
        }
        Update: {
          authenticated_user_id?: string | null
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
          authenticated_student_id: string | null
          created_at: string
          id: string
          points_earned: number
          points_possible: number
          practice_exercise_id: string | null
          score: number
          skill_name: string
          student_id: string | null
          test_result_id: string | null
        }
        Insert: {
          authenticated_student_id?: string | null
          created_at?: string
          id?: string
          points_earned: number
          points_possible: number
          practice_exercise_id?: string | null
          score: number
          skill_name: string
          student_id?: string | null
          test_result_id?: string | null
        }
        Update: {
          authenticated_student_id?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          points_possible?: number
          practice_exercise_id?: string | null
          score?: number
          skill_name?: string
          student_id?: string | null
          test_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_skill_scores_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_skill_scores_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subject_skill_scores_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subject_skill_scores_practice_exercise_id_fkey"
            columns: ["practice_exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_skill_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
          },
          {
            foreignKeyName: "subject_skill_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
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
          authenticated_student_id: string | null
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
          authenticated_student_id?: string | null
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
          authenticated_student_id?: string | null
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
            foreignKeyName: "test_results_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "student_data_transition"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "test_results_authenticated_student_id_fkey"
            columns: ["authenticated_student_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "student_data_transition"
            referencedColumns: ["student_profile_id"]
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
      trailblazer_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          description: string | null
          icon_name: string | null
          id: string
          metadata: Json | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          description?: string | null
          icon_name?: string | null
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trailblazer_session_misconceptions: {
        Row: {
          created_at: string | null
          id: string
          misconception_id: string
          question_sequence: number | null
          resolution_status: string | null
          session_id: string
          time_occurred: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          misconception_id: string
          question_sequence?: number | null
          resolution_status?: string | null
          session_id: string
          time_occurred?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          misconception_id?: string
          question_sequence?: number | null
          resolution_status?: string | null
          session_id?: string
          time_occurred?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trailblazer_session_misconceptions_misconception_id_fkey"
            columns: ["misconception_id"]
            isOneToOne: false
            referencedRelation: "student_misconceptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trailblazer_session_misconceptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trailblazer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trailblazer_sessions: {
        Row: {
          actual_duration_minutes: number | null
          class_id: string | null
          created_at: string | null
          duration_minutes: number
          focus_concept: string
          goal_type: string
          grade: string | null
          id: string
          misconception_ids: string[] | null
          misconception_summary: Json | null
          mistake_types_encountered: Json | null
          score_improvement: number | null
          session_date: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          class_id?: string | null
          created_at?: string | null
          duration_minutes: number
          focus_concept: string
          goal_type: string
          grade?: string | null
          id?: string
          misconception_ids?: string[] | null
          misconception_summary?: Json | null
          mistake_types_encountered?: Json | null
          score_improvement?: number | null
          session_date?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          class_id?: string | null
          created_at?: string | null
          duration_minutes?: number
          focus_concept?: string
          goal_type?: string
          grade?: string | null
          id?: string
          misconception_ids?: string[] | null
          misconception_summary?: Json | null
          mistake_types_encountered?: Json | null
          score_improvement?: number | null
          session_date?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trailblazer_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_student_misconceptions: {
        Row: {
          confidence_score: number | null
          content_skill_name: string | null
          context_data: Json | null
          correct_answer: string | null
          created_at: string | null
          detected_at: string | null
          id: string
          misconception_category: string | null
          misconception_type: string
          persistence_count: number | null
          question_id: string | null
          resolved: boolean | null
          session_id: string | null
          session_type: string
          severity: string | null
          skill_name: string
          student_answer: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          content_skill_name?: string | null
          context_data?: Json | null
          correct_answer?: string | null
          created_at?: string | null
          detected_at?: string | null
          id?: string
          misconception_category?: string | null
          misconception_type: string
          persistence_count?: number | null
          question_id?: string | null
          resolved?: boolean | null
          session_id?: string | null
          session_type: string
          severity?: string | null
          skill_name: string
          student_answer?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          content_skill_name?: string | null
          context_data?: Json | null
          correct_answer?: string | null
          created_at?: string | null
          detected_at?: string | null
          id?: string
          misconception_category?: string | null
          misconception_type?: string
          persistence_count?: number | null
          question_id?: string | null
          resolved?: boolean | null
          session_id?: string | null
          session_type?: string
          severity?: string | null
          skill_name?: string
          student_answer?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unified_student_results: {
        Row: {
          created_at: string | null
          exercise_data: Json | null
          id: string
          points_earned: number
          points_possible: number
          score: number
          session_id: string | null
          session_type: string
          skill_name: string
          skill_type: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_data?: Json | null
          id?: string
          points_earned?: number
          points_possible?: number
          score: number
          session_id?: string | null
          session_type: string
          skill_name: string
          skill_type: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_data?: Json | null
          id?: string
          points_earned?: number
          points_possible?: number
          score?: number
          session_id?: string | null
          session_type?: string
          skill_name?: string
          skill_type?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_concept_mastery: {
        Row: {
          concept: string
          created_at: string | null
          last_practiced_at: string | null
          mastery_score: number | null
          mistake_history: Json | null
          practice_count: number | null
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string | null
          last_practiced_at?: string | null
          mastery_score?: number | null
          mistake_history?: Json | null
          practice_count?: number | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string | null
          last_practiced_at?: string | null
          mastery_score?: number | null
          mistake_history?: Json | null
          practice_count?: number | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak_days: number | null
          last_session_date: string | null
          longest_streak_days: number | null
          rescue_used_today: boolean | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak_days?: number | null
          last_session_date?: string | null
          longest_streak_days?: number | null
          rescue_used_today?: boolean | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak_days?: number | null
          last_session_date?: string | null
          longest_streak_days?: number | null
          rescue_used_today?: boolean | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      job_performance_stats: {
        Row: {
          avg_duration_seconds: number | null
          job_count: number | null
          max_duration_seconds: number | null
          newest_job: string | null
          oldest_job: string | null
          status: string | null
        }
        Relationships: []
      }
      question_misconceptions: {
        Row: {
          choice_misconceptions: Json | null
          question_number: number | null
          question_source: string | null
          question_text: string | null
          source_id: string | null
        }
        Relationships: []
      }
      student_data_transition: {
        Row: {
          auth_user_name: string | null
          authenticated_user_id: string | null
          email: string | null
          migration_status: string | null
          mock_student_id: string | null
          profile_id: string | null
          student_name: string | null
          student_profile_id: string | null
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          created_at: string | null
          display_teacher_id: string | null
          email: string | null
          full_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_teacher_id?: string | null
          email?: string | null
          full_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_teacher_id?: string | null
          email?: string | null
          full_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_goal_progress: {
        Args: { p_goal_id: string }
        Returns: number
      }
      calculate_updated_skill_score: {
        Args: {
          current_score: number
          new_score: number
          current_attempts: number
          recency_weight?: number
        }
        Returns: number
      }
      claim_file_jobs: {
        Args: { batch_size?: number }
        Returns: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_group_data: Json
          id: string
          max_retries: number
          priority: string
          processing_time_ms: number | null
          result_json: Json | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }[]
      }
      claim_pending_jobs: {
        Args: { batch_size: number }
        Returns: {
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
        }[]
      }
      cleanup_completed_grading_jobs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_goal_achievements: {
        Args: { p_student_id: string; p_goal_id: string }
        Returns: undefined
      }
      generate_display_teacher_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_teacher_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_authenticated_user_content_skills: {
        Args: { auth_user_id: string }
        Returns: {
          id: string
          skill_name: string
          score: number
          points_earned: number
          points_possible: number
          created_at: string
          test_result_id: string
          practice_exercise_id: string
        }[]
      }
      get_authenticated_user_subject_skills: {
        Args: { auth_user_id: string }
        Returns: {
          id: string
          skill_name: string
          score: number
          points_earned: number
          points_possible: number
          created_at: string
          test_result_id: string
          practice_exercise_id: string
        }[]
      }
      get_authenticated_user_test_results: {
        Args: { auth_user_id: string }
        Returns: {
          id: string
          exam_id: string
          class_id: string
          overall_score: number
          total_points_earned: number
          total_points_possible: number
          detailed_analysis: string
          ai_feedback: string
          created_at: string
        }[]
      }
      get_class_concepts_for_session: {
        Args: { p_class_id: string }
        Returns: {
          concept_name: string
          subject: string
          grade: string
          skill_names: string[]
        }[]
      }
      get_class_progress_analytics: {
        Args: { p_class_id: string; p_days?: number }
        Returns: {
          student_id: string
          student_name: string
          skill_name: string
          skill_type: string
          accuracy: number
          confidence_score: number
          attempts_count: number
          misconceptions_count: number
          last_practiced_at: string
        }[]
      }
      get_enhanced_mistake_analysis: {
        Args: { student_uuid: string; skill_filter?: string }
        Returns: {
          skill_name: string
          misconception_category: string
          error_severity: string
          error_count: number
          average_persistence: number
          common_prerequisites_gaps: string[]
          remediation_themes: string[]
          cognitive_patterns: Json
        }[]
      }
      get_exam_skill_name: {
        Args: { p_exam_id: string; p_question_number: number }
        Returns: string
      }
      get_file_job_queue_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          pending_jobs: number
          processing_jobs: number
          completed_jobs_today: number
          failed_jobs_today: number
          avg_processing_time_ms: number
        }[]
      }
      get_grading_queue_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          pending_jobs: number
          processing_jobs: number
          completed_jobs_today: number
          failed_jobs_today: number
          avg_processing_time_ms: number
        }[]
      }
      get_or_create_adaptive_profile: {
        Args: { p_student_id: string }
        Returns: string
      }
      get_processing_job_count: {
        Args: Record<PropertyKey, never>
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
      get_student_enrolled_classes: {
        Args: { student_user_id: string }
        Returns: {
          class_id: string
          class_name: string
          subject: string
          grade: string
          teacher_name: string
        }[]
      }
      get_student_exercise_skill_name: {
        Args: { p_exercise_id: string }
        Returns: string
      }
      get_student_goal_analytics: {
        Args: { p_student_id: string }
        Returns: {
          total_goals: number
          active_goals: number
          completed_goals: number
          avg_completion_time_days: number
          most_successful_goal_type: string
          current_streaks: Json
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
      get_student_progress_analytics: {
        Args: { p_student_id: string; p_days?: number }
        Returns: {
          skill_name: string
          skill_type: string
          avg_accuracy: number
          avg_confidence: number
          total_attempts: number
          total_time_spent: number
          latest_accuracy: number
          improvement_trend: number
          session_types: string[]
        }[]
      }
      get_teacher_students_trailblazer_progress: {
        Args: { teacher_user_id?: string }
        Returns: {
          student_id: string
          student_name: string
          current_streak_days: number
          total_sessions: number
          avg_mastery_score: number
          last_session_date: string
          class_name: string
        }[]
      }
      get_unified_misconception_analysis: {
        Args: { p_student_id: string; p_days?: number }
        Returns: {
          skill_name: string
          misconception_type: string
          misconception_category: string
          total_occurrences: number
          avg_persistence: number
          severity_distribution: Json
          session_types: string[]
          resolved_count: number
          active_count: number
          latest_detection: string
        }[]
      }
      get_unified_student_performance: {
        Args: { p_student_id: string; p_days?: number }
        Returns: {
          skill_name: string
          skill_type: string
          avg_score: number
          total_attempts: number
          best_score: number
          latest_score: number
          session_types: string[]
          last_practiced_at: string
        }[]
      }
      get_user_display_teacher_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      identify_common_error_patterns: {
        Args: { skill_name_filter?: string }
        Returns: {
          error_pattern_id: string
          pattern_frequency: number
          average_severity: string
          common_misconceptions: string[]
          affected_skills: string[]
          suggested_interventions: string[]
        }[]
      }
      log_learning_event: {
        Args: {
          p_student_id: string
          p_event_type: string
          p_skill_name: string
          p_skill_type: string
          p_difficulty_level: string
          p_performance_change?: number
          p_confidence_change?: number
          p_context?: Json
        }
        Returns: string
      }
      migrate_student_data_to_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      release_queue_lock: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      try_acquire_queue_lock: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_concept_mastery: {
        Args: {
          p_user_id: string
          p_concept: string
          p_score_change: number
          p_time_spent: number
        }
        Returns: undefined
      }
      update_learning_velocity: {
        Args: { p_student_id: string; p_performance_change: number }
        Returns: undefined
      }
      update_misconception_persistence: {
        Args: { p_student_id: string; p_subtype_id: string }
        Returns: undefined
      }
      update_user_streak: {
        Args: { p_user_id: string }
        Returns: undefined
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
