
export class StudentIdGenerationService {
  private static readonly ID_PREFIX_MAP: Record<string, string> = {
    'Kindergarten': 'K',
    'Grade 1': 'G1',
    'Grade 2': 'G2',
    'Grade 3': 'G3',
    'Grade 4': 'G4',
    'Grade 5': 'G5',
    'Grade 6': 'G6',
    'Grade 7': 'G7',
    'Grade 8': 'G8',
    'Grade 9': 'G9',
    'Grade 10': 'G10',
    'Grade 11': 'G11',
    'Grade 12': 'G12',
  };

  static generateStudentId(year?: string): string {
    console.log('🆔 Generating Student ID for year:', year);
    
    // Get prefix based on year/grade
    const prefix = year && this.ID_PREFIX_MAP[year] ? this.ID_PREFIX_MAP[year] : 'STU';
    
    // Generate 6-digit number
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    
    // Combine prefix and number
    const studentId = `${prefix}${randomNumber}`;
    
    console.log('✅ Generated Student ID:', studentId);
    return studentId;
  }

  static async generateUniqueStudentId(year?: string, maxAttempts: number = 10): Promise<string> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const candidateId = this.generateStudentId(year);
      
      // Check if ID already exists in student_profiles
      const { data: existingProfile, error } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('student_id', candidateId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking Student ID uniqueness:', error);
        throw new Error(`Failed to validate Student ID uniqueness: ${error.message}`);
      }

      if (!existingProfile) {
        console.log(`✅ Unique Student ID generated on attempt ${attempt}:`, candidateId);
        return candidateId;
      }

      console.log(`🔄 Student ID ${candidateId} already exists, trying again (attempt ${attempt}/${maxAttempts})`);
    }

    throw new Error(`Failed to generate unique Student ID after ${maxAttempts} attempts`);
  }

  static async backfillMissingStudentIds(): Promise<void> {
    console.log('🔄 Starting backfill of missing Student IDs');
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      // Get all student profiles without Student IDs
      const { data: studentsWithoutIds, error: fetchError } = await supabase
        .from('student_profiles')
        .select('id, student_name')
        .is('student_id', null);

      if (fetchError) {
        console.error('❌ Error fetching students without IDs:', fetchError);
        throw fetchError;
      }

      if (!studentsWithoutIds || studentsWithoutIds.length === 0) {
        console.log('✅ No students found without Student IDs');
        return;
      }

      console.log(`📝 Found ${studentsWithoutIds.length} students without Student IDs`);

      // Generate and assign IDs
      for (const student of studentsWithoutIds) {
        try {
          const newStudentId = await this.generateUniqueStudentId();
          
          const { error: updateError } = await supabase
            .from('student_profiles')
            .update({ student_id: newStudentId })
            .eq('id', student.id);

          if (updateError) {
            console.error(`❌ Failed to update Student ID for ${student.student_name}:`, updateError);
          } else {
            console.log(`✅ Assigned Student ID ${newStudentId} to ${student.student_name}`);
          }
        } catch (error) {
          console.error(`❌ Error processing student ${student.student_name}:`, error);
        }
      }

      console.log('✅ Backfill process completed');
    } catch (error) {
      console.error('❌ Error in backfill process:', error);
      throw error;
    }
  }

  static isValidStudentIdFormat(studentId: string): boolean {
    // Check if it matches our generated format: prefix + 6 digits
    const validPrefixes = Object.values(this.ID_PREFIX_MAP).concat(['STU']);
    const pattern = new RegExp(`^(${validPrefixes.join('|')})\\d{6}$`);
    return pattern.test(studentId);
  }
}
