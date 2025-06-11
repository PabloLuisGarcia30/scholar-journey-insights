
import { supabase } from "@/integrations/supabase/client";
import { StudentIdGenerationService } from "./studentIdGenerationService";

export interface StudentIdIntegrationResult {
  success: boolean;
  studentProfileId: string;
  studentId: string;
  wasCreated: boolean;
  enrolledInClass?: boolean;
  error?: string;
}

export interface ClassEnrollmentResult {
  success: boolean;
  enrollmentId?: string;
  alreadyEnrolled?: boolean;
  error?: string;
}

export class StudentIdIntegrationService {
  
  /**
   * Core method: Get or create student profile with proper Student ID
   * This ensures every grading operation links to a consistent Student ID
   */
  static async getOrCreateStudentProfile(
    studentName: string,
    classId?: string,
    email?: string,
    gradeLevel?: string
  ): Promise<StudentIdIntegrationResult> {
    try {
      console.log('🔄 Getting or creating student profile for:', studentName);

      // Step 1: Try to find existing student by name
      const { data: existingStudent, error: findError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('student_name', studentName)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw new Error(`Failed to search for student: ${findError.message}`);
      }

      if (existingStudent) {
        console.log('✅ Found existing student profile:', existingStudent.id);
        
        // Ensure student has Student ID
        if (!existingStudent.student_id) {
          const generatedStudentId = await StudentIdGenerationService.generateUniqueStudentId(gradeLevel);
          
          const { data: updatedStudent, error: updateError } = await supabase
            .from('student_profiles')
            .update({ student_id: generatedStudentId })
            .eq('id', existingStudent.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(`Failed to update student with Student ID: ${updateError.message}`);
          }

          console.log('🆔 Added Student ID to existing profile:', generatedStudentId);
          return {
            success: true,
            studentProfileId: updatedStudent.id,
            studentId: generatedStudentId,
            wasCreated: false
          };
        }

        return {
          success: true,
          studentProfileId: existingStudent.id,
          studentId: existingStudent.student_id,
          wasCreated: false
        };
      }

      // Step 2: Create new student profile with Student ID
      const generatedStudentId = await StudentIdGenerationService.generateUniqueStudentId(gradeLevel);
      
      const { data: newStudent, error: createError } = await supabase
        .from('student_profiles')
        .insert({
          student_name: studentName,
          email: email,
          student_id: generatedStudentId
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create student profile: ${createError.message}`);
      }

      console.log('✅ Created new student profile with Student ID:', newStudent.id, generatedStudentId);

      return {
        success: true,
        studentProfileId: newStudent.id,
        studentId: generatedStudentId,
        wasCreated: true
      };

    } catch (error) {
      console.error('❌ Error in getOrCreateStudentProfile:', error);
      return {
        success: false,
        studentProfileId: '',
        studentId: '',
        wasCreated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Auto-enroll student in class when detected through grading
   */
  static async autoEnrollStudentInClass(
    studentProfileId: string,
    classId: string
  ): Promise<ClassEnrollmentResult> {
    try {
      console.log('🔄 Auto-enrolling student in class:', studentProfileId, classId);

      // Check if already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('student_class_enrollments')
        .select('id, is_active')
        .eq('student_id', studentProfileId)
        .eq('class_id', classId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check enrollment: ${checkError.message}`);
      }

      if (existingEnrollment) {
        if (existingEnrollment.is_active) {
          console.log('✅ Student already enrolled in class');
          return {
            success: true,
            enrollmentId: existingEnrollment.id,
            alreadyEnrolled: true
          };
        } else {
          // Reactivate enrollment
          const { data: reactivated, error: reactivateError } = await supabase
            .from('student_class_enrollments')
            .update({ is_active: true })
            .eq('id', existingEnrollment.id)
            .select()
            .single();

          if (reactivateError) {
            throw new Error(`Failed to reactivate enrollment: ${reactivateError.message}`);
          }

          console.log('✅ Reactivated student enrollment in class');
          return {
            success: true,
            enrollmentId: reactivated.id,
            alreadyEnrolled: false
          };
        }
      }

      // Create new enrollment
      const { data: newEnrollment, error: enrollError } = await supabase
        .from('student_class_enrollments')
        .insert({
          student_id: studentProfileId,
          class_id: classId,
          enrollment_method: 'automatic'
        })
        .select()
        .single();

      if (enrollError) {
        throw new Error(`Failed to create enrollment: ${enrollError.message}`);
      }

      console.log('✅ Successfully enrolled student in class:', newEnrollment.id);
      return {
        success: true,
        enrollmentId: newEnrollment.id,
        alreadyEnrolled: false
      };

    } catch (error) {
      console.error('❌ Error in autoEnrollStudentInClass:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Comprehensive method: Handle complete student integration for grading
   */
  static async integrateStudentForGrading(
    studentName: string,
    classId?: string,
    email?: string,
    gradeLevel?: string
  ): Promise<StudentIdIntegrationResult> {
    try {
      console.log('🔄 Starting comprehensive student integration for grading');

      // Step 1: Get or create student profile
      const profileResult = await this.getOrCreateStudentProfile(
        studentName, 
        classId, 
        email, 
        gradeLevel
      );

      if (!profileResult.success) {
        return profileResult;
      }

      // Step 2: Auto-enroll in class if class context is provided
      if (classId) {
        const enrollmentResult = await this.autoEnrollStudentInClass(
          profileResult.studentProfileId,
          classId
        );

        if (enrollmentResult.success) {
          profileResult.enrolledInClass = true;
          console.log('✅ Student integration completed with class enrollment');
        } else {
          console.warn('⚠️  Student profile created but class enrollment failed:', enrollmentResult.error);
          // Don't fail the overall operation if enrollment fails
        }
      }

      console.log('🎉 Student integration completed successfully:', {
        studentId: profileResult.studentId,
        profileId: profileResult.studentProfileId,
        wasCreated: profileResult.wasCreated,
        enrolledInClass: profileResult.enrolledInClass
      });

      return profileResult;

    } catch (error) {
      console.error('❌ Error in integrateStudentForGrading:', error);
      return {
        success: false,
        studentProfileId: '',
        studentId: '',
        wasCreated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get student's enrollment status across all classes
   */
  static async getStudentEnrollments(studentProfileId: string) {
    try {
      const { data: enrollments, error } = await supabase
        .from('student_class_enrollments')
        .select(`
          *,
          active_classes:class_id (
            id,
            name,
            subject,
            grade,
            teacher
          )
        `)
        .eq('student_id', studentProfileId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch enrollments: ${error.message}`);
      }

      return {
        success: true,
        enrollments: enrollments || []
      };

    } catch (error) {
      console.error('❌ Error getting student enrollments:', error);
      return {
        success: false,
        enrollments: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Backfill existing test results with proper Student ID relationships
   */
  static async backfillStudentIdRelationships(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    try {
      console.log('🔄 Starting backfill of Student ID relationships');

      const errors: string[] = [];
      let processed = 0;

      // Get all test results that might need student ID linking
      const { data: testResults, error: fetchError } = await supabase
        .from('test_results')
        .select(`
          id,
          student_id,
          class_id,
          content_skill_scores(id, student_id),
          subject_skill_scores(id, student_id)
        `);

      if (fetchError) {
        throw new Error(`Failed to fetch test results: ${fetchError.message}`);
      }

      for (const testResult of testResults || []) {
        try {
          // Update content_skill_scores that don't have student_id set
          const contentScoresWithoutStudentId = testResult.content_skill_scores?.filter(
            (score: any) => !score.student_id
          ) || [];

          if (contentScoresWithoutStudentId.length > 0) {
            const { error: contentUpdateError } = await supabase
              .from('content_skill_scores')
              .update({ student_id: testResult.student_id })
              .eq('test_result_id', testResult.id)
              .is('student_id', null);

            if (contentUpdateError) {
              errors.push(`Failed to update content skills for test ${testResult.id}: ${contentUpdateError.message}`);
            } else {
              processed += contentScoresWithoutStudentId.length;
            }
          }

          // Update subject_skill_scores that don't have student_id set
          const subjectScoresWithoutStudentId = testResult.subject_skill_scores?.filter(
            (score: any) => !score.student_id
          ) || [];

          if (subjectScoresWithoutStudentId.length > 0) {
            const { error: subjectUpdateError } = await supabase
              .from('subject_skill_scores')
              .update({ student_id: testResult.student_id })
              .eq('test_result_id', testResult.id)
              .is('student_id', null);

            if (subjectUpdateError) {
              errors.push(`Failed to update subject skills for test ${testResult.id}: ${subjectUpdateError.message}`);
            } else {
              processed += subjectScoresWithoutStudentId.length;
            }
          }

        } catch (error) {
          errors.push(`Error processing test result ${testResult.id}: ${error}`);
        }
      }

      console.log(`✅ Backfill completed: ${processed} records processed, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        processed,
        errors
      };

    } catch (error) {
      console.error('❌ Error in backfillStudentIdRelationships:', error);
      return {
        success: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Export singleton-style functions for easy access
export const studentIdIntegration = {
  getOrCreateProfile: StudentIdIntegrationService.getOrCreateStudentProfile.bind(StudentIdIntegrationService),
  autoEnrollInClass: StudentIdIntegrationService.autoEnrollStudentInClass.bind(StudentIdIntegrationService),
  integrateForGrading: StudentIdIntegrationService.integrateStudentForGrading.bind(StudentIdIntegrationService),
  getEnrollments: StudentIdIntegrationService.getStudentEnrollments.bind(StudentIdIntegrationService),
  backfillRelationships: StudentIdIntegrationService.backfillStudentIdRelationships.bind(StudentIdIntegrationService)
};
