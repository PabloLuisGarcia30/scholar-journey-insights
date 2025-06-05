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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          correct_answer: string
          created_at: string
          exam_id: string
          id: string
          options: Json | null
          points: number
          question_number: number
          question_text: string
          question_type: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          exam_id: string
          id?: string
          options?: Json | null
          points?: number
          question_number: number
          question_text: string
          question_type: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          exam_id?: string
          id?: string
          options?: Json | null
          points?: number
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
        ]
      }
      content_skill_scores: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          points_possible: number
          score: number
          skill_name: string
          test_result_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned: number
          points_possible: number
          score: number
          skill_name: string
          test_result_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          points_possible?: number
          score?: number
          skill_name?: string
          test_result_id?: string
        }
        Relationships: [
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
          grade: string
          id?: string
          skill_description: string
          skill_name: string
          subject: string
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
      subject_skill_scores: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          points_possible: number
          score: number
          skill_name: string
          test_result_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned: number
          points_possible: number
          score: number
          skill_name: string
          test_result_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          points_possible?: number
          score?: number
          skill_name?: string
          test_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_skill_scores_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
