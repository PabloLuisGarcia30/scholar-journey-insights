import { type SkillScore } from "@/services/examService";

export const mockClassData = {
  assignments: [
    { name: 'Quiz 1: Basic Operations', grade: 92, maxGrade: 100, date: '2024-01-15' },
    { name: 'Homework Set 1', grade: 85, maxGrade: 100, date: '2024-01-20' },
    { name: 'Midterm Exam', grade: 88, maxGrade: 100, date: '2024-02-15' },
    { name: 'Project: Real World Math', grade: 90, maxGrade: 100, date: '2024-02-28' },
    { name: 'Quiz 2: Fractions', grade: 82, maxGrade: 100, date: '2024-03-05' },
  ],
  attendanceRate: 95,
  participationScore: 8.5,
};

export const gradeHistory = [
  { semester: 'Fall 2023', gpa: 3.7, credits: 15 },
  { semester: 'Spring 2024', gpa: 3.9, credits: 16 },
  { semester: 'Summer 2024', gpa: 4.0, credits: 6 },
  { semester: 'Fall 2024', gpa: 3.8, credits: 15 },
];

export const courseGrades = [
  { course: 'Data Structures', grade: 'A', credits: 3, progress: 95 },
  { course: 'Algorithms', grade: 'A-', credits: 3, progress: 87 },
  { course: 'Database Systems', grade: 'B+', credits: 4, progress: 82 },
  { course: 'Web Development', grade: 'A', credits: 3, progress: 93 },
  { course: 'Software Engineering', grade: 'A-', credits: 4, progress: 89 },
];

// PABLO LUIS GARCIA MOCK DATA
export const mockPabloContentSkillScores: SkillScore[] = [
  // ALGEBRA AND FUNCTIONS
  { id: 'mock-1', test_result_id: 'test-1', skill_name: 'Factoring Polynomials', score: 85, points_earned: 17, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-2', test_result_id: 'test-1', skill_name: 'Solving Systems of Equations', score: 92, points_earned: 23, points_possible: 25, created_at: '2024-01-15' },
  { id: 'mock-3', test_result_id: 'test-1', skill_name: 'Understanding Function Notation', score: 78, points_earned: 19, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-4', test_result_id: 'test-2', skill_name: 'Graphing Linear and Quadratic Functions', score: 88, points_earned: 22, points_possible: 25, created_at: '2024-02-15' },
  { id: 'mock-5', test_result_id: 'test-2', skill_name: 'Working with Exponential Functions', score: 75, points_earned: 15, points_possible: 20, created_at: '2024-02-15' },
  
  // GEOMETRY
  { id: 'mock-6', test_result_id: 'test-1', skill_name: 'Properties of Similar Triangles', score: 90, points_earned: 18, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-7', test_result_id: 'test-1', skill_name: 'Area and Perimeter Calculations', score: 95, points_earned: 19, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-8', test_result_id: 'test-2', skill_name: 'Volume and Surface Area of 3D Objects', score: 82, points_earned: 20, points_possible: 24, created_at: '2024-02-15' },
  { id: 'mock-9', test_result_id: 'test-2', skill_name: 'Coordinate Geometry', score: 87, points_earned: 21, points_possible: 24, created_at: '2024-02-15' },
  { id: 'mock-10', test_result_id: 'test-3', skill_name: 'Geometric Transformations', score: 79, points_earned: 16, points_possible: 20, created_at: '2024-03-05' },
  
  // TRIGONOMETRY
  { id: 'mock-11', test_result_id: 'test-1', skill_name: 'Basic Trigonometric Ratios', score: 93, points_earned: 22, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-12', test_result_id: 'test-2', skill_name: 'Solving Right Triangle Problems', score: 86, points_earned: 17, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-13', test_result_id: 'test-2', skill_name: 'Unit Circle and Angle Measures', score: 74, points_earned: 15, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-14', test_result_id: 'test-3', skill_name: 'Trigonometric Identities', score: 81, points_earned: 19, points_possible: 24, created_at: '2024-03-05' },
  { id: 'mock-15', test_result_id: 'test-3', skill_name: 'Applications of Trigonometry', score: 89, points_earned: 18, points_possible: 20, created_at: '2024-03-05' },
  
  // DATA ANALYSIS AND PROBABILITY
  { id: 'mock-16', test_result_id: 'test-1', skill_name: 'Statistical Measures and Interpretation', score: 91, points_earned: 22, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-17', test_result_id: 'test-2', skill_name: 'Probability Calculations', score: 83, points_earned: 20, points_possible: 24, created_at: '2024-02-15' },
  { id: 'mock-18', test_result_id: 'test-2', skill_name: 'Data Collection and Sampling', score: 88, points_earned: 18, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-19', test_result_id: 'test-3', skill_name: 'Creating and Interpreting Graphs', score: 94, points_earned: 23, points_possible: 24, created_at: '2024-03-05' },
  { id: 'mock-20', test_result_id: 'test-3', skill_name: 'Making Predictions from Data', score: 77, points_earned: 15, points_possible: 20, created_at: '2024-03-05' },
  
  // PROBLEM SOLVING AND REASONING
  { id: 'mock-21', test_result_id: 'test-1', skill_name: 'Mathematical Modeling', score: 85, points_earned: 17, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-22', test_result_id: 'test-2', skill_name: 'Critical Thinking in Mathematics', score: 89, points_earned: 21, points_possible: 24, created_at: '2024-02-15' },
  { id: 'mock-23', test_result_id: 'test-2', skill_name: 'Pattern Recognition', score: 92, points_earned: 18, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-24', test_result_id: 'test-3', skill_name: 'Logical Reasoning', score: 80, points_earned: 19, points_possible: 24, created_at: '2024-03-05' },
  { id: 'mock-25', test_result_id: 'test-3', skill_name: 'Problem-Solving Strategies', score: 87, points_earned: 17, points_possible: 20, created_at: '2024-03-05' },
];

export const mockPabloSubjectSkillScores: SkillScore[] = [
  // MATHEMATICAL REASONING
  { id: 'mock-subj-1', test_result_id: 'test-1', skill_name: 'Problem-solving strategies', score: 88, points_earned: 22, points_possible: 25, created_at: '2024-01-15' },
  { id: 'mock-subj-2', test_result_id: 'test-1', skill_name: 'Mathematical communication', score: 92, points_earned: 23, points_possible: 25, created_at: '2024-01-15' },
  { id: 'mock-subj-3', test_result_id: 'test-2', skill_name: 'Logical reasoning', score: 85, points_earned: 17, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-subj-4', test_result_id: 'test-2', skill_name: 'Critical thinking', score: 90, points_earned: 18, points_possible: 20, created_at: '2024-02-15' },
  
  // COMPUTATIONAL FLUENCY
  { id: 'mock-subj-5', test_result_id: 'test-1', skill_name: 'Mental math skills', score: 78, points_earned: 19, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-subj-6', test_result_id: 'test-2', skill_name: 'Calculator usage', score: 95, points_earned: 19, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-subj-7', test_result_id: 'test-3', skill_name: 'Estimation techniques', score: 82, points_earned: 20, points_possible: 24, created_at: '2024-03-05' },
  
  // MATHEMATICAL MODELING
  { id: 'mock-subj-8', test_result_id: 'test-1', skill_name: 'Real-world applications', score: 89, points_earned: 21, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-subj-9', test_result_id: 'test-2', skill_name: 'Creating mathematical models', score: 87, points_earned: 17, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-subj-10', test_result_id: 'test-3', skill_name: 'Interpreting results', score: 91, points_earned: 22, points_possible: 24, created_at: '2024-03-05' },
];

export const mockPabloGeographySubjectSkillScores: SkillScore[] = [
  // GEOGRAPHIC INQUIRY
  { id: 'mock-geo-subj-1', test_result_id: 'geo-test-1', skill_name: 'Formulating geographic questions', score: 86, points_earned: 21, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-geo-subj-2', test_result_id: 'geo-test-2', skill_name: 'Analyzing geographic data', score: 90, points_earned: 18, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-geo-subj-3', test_result_id: 'geo-test-3', skill_name: 'Drawing geographic conclusions', score: 88, points_earned: 22, points_possible: 25, created_at: '2024-03-05' },
  
  // SPATIAL ANALYSIS
  { id: 'mock-geo-subj-4', test_result_id: 'geo-test-1', skill_name: 'Reading maps and graphs', score: 92, points_earned: 23, points_possible: 25, created_at: '2024-01-15' },
  { id: 'mock-geo-subj-5', test_result_id: 'geo-test-2', skill_name: 'Understanding scale and distance', score: 84, points_earned: 17, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-geo-subj-6', test_result_id: 'geo-test-3', skill_name: 'Spatial pattern recognition', score: 89, points_earned: 21, points_possible: 24, created_at: '2024-03-05' },
  
  // GEOGRAPHIC COMMUNICATION
  { id: 'mock-geo-subj-7', test_result_id: 'geo-test-1', skill_name: 'Creating geographic presentations', score: 87, points_earned: 20, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-geo-subj-8', test_result_id: 'geo-test-2', skill_name: 'Using geographic terminology', score: 91, points_earned: 18, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-geo-subj-9', test_result_id: 'geo-test-3', skill_name: 'Defending geographic arguments', score: 85, points_earned: 17, points_possible: 20, created_at: '2024-03-05' },
];

export const mockPabloGeographyContentSkillScores: SkillScore[] = [
  // POPULATIONS IN TRANSITION
  { id: 'mock-geo-1', test_result_id: 'geo-test-1', skill_name: 'Interpreting population pyramids', score: 89, points_earned: 18, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-geo-2', test_result_id: 'geo-test-1', skill_name: 'Analyzing demographic transition models', score: 82, points_earned: 20, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-geo-3', test_result_id: 'geo-test-1', skill_name: 'Calculating demographic rates', score: 76, points_earned: 15, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-geo-4', test_result_id: 'geo-test-2', skill_name: 'Evaluating aging population implications', score: 91, points_earned: 22, points_possible: 24, created_at: '2024-02-15' },
  
  // DISPARITIES IN WEALTH AND DEVELOPMENT
  { id: 'mock-geo-5', test_result_id: 'geo-test-1', skill_name: 'Interpreting development indicators', score: 88, points_earned: 21, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-geo-6', test_result_id: 'geo-test-1', skill_name: 'Comparing disparities at different scales', score: 85, points_earned: 17, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-geo-7', test_result_id: 'geo-test-2', skill_name: 'Analyzing economic disparity case studies', score: 93, points_earned: 19, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-geo-8', test_result_id: 'geo-test-2', skill_name: 'Evaluating development strategies', score: 79, points_earned: 19, points_possible: 24, created_at: '2024-02-15' },
  
  // PATTERNS IN ENVIRONMENTAL QUALITY AND SUSTAINABILITY
  { id: 'mock-geo-9', test_result_id: 'geo-test-1', skill_name: 'Understanding ecological footprints', score: 87, points_earned: 17, points_possible: 20, created_at: '2024-01-15' },
  { id: 'mock-geo-10', test_result_id: 'geo-test-2', skill_name: 'Interpreting climate change data', score: 92, points_earned: 23, points_possible: 25, created_at: '2024-02-15' },
  { id: 'mock-geo-11', test_result_id: 'geo-test-2', skill_name: 'Evaluating footprint reduction strategies', score: 84, points_earned: 21, points_possible: 25, created_at: '2024-02-15' },
  { id: 'mock-geo-12', test_result_id: 'geo-test-3', skill_name: 'Assessing environmental impacts', score: 90, points_earned: 18, points_possible: 20, created_at: '2024-03-05' },
  
  // PATTERNS IN RESOURCE CONSUMPTION
  { id: 'mock-geo-13', test_result_id: 'geo-test-1', skill_name: 'Analyzing global consumption trends', score: 86, points_earned: 21, points_possible: 24, created_at: '2024-01-15' },
  { id: 'mock-geo-14', test_result_id: 'geo-test-2', skill_name: 'Calculating resource depletion rates', score: 78, points_earned: 16, points_possible: 20, created_at: '2024-02-15' },
  { id: 'mock-geo-15', test_result_id: 'geo-test-2', skill_name: 'Evaluating resource management strategies', score: 88, points_earned: 22, points_possible: 25, created_at: '2024-02-15' },
  { id: 'mock-geo-16', test_result_id: 'geo-test-3', skill_name: 'Interpreting energy and water security data', score: 83, points_earned: 20, points_possible: 24, created_at: '2024-03-05' },
];

export const mockPabloGeographyTestResults = [
  {
    id: 'geo-test-result-1',
    student_id: 'pablo-student-id',
    exam_id: 'geo-exam-1',
    class_id: 'geography-11-class-id',
    overall_score: 85.5,
    total_points_earned: 171,
    total_points_possible: 200,
    created_at: '2024-01-15',
    ai_feedback: 'Strong performance in interpreting population data and development indicators. Could improve on demographic calculations.',
    detailed_analysis: 'Pablo shows excellent understanding of population dynamics and development concepts. His analysis of case studies is particularly strong.'
  },
  {
    id: 'geo-test-result-2',
    student_id: 'pablo-student-id',
    exam_id: 'geo-exam-2',
    class_id: 'geography-11-class-id',
    overall_score: 88.2,
    total_points_earned: 191,
    total_points_possible: 216,
    created_at: '2024-02-15',
    ai_feedback: 'Excellent work on environmental sustainability topics. Shows good grasp of climate change data interpretation.',
    detailed_analysis: 'Pablo demonstrates strong analytical skills in environmental geography. His understanding of resource management strategies is commendable.'
  },
  {
    id: 'geo-test-result-3',
    student_id: 'pablo-student-id',
    exam_id: 'geo-exam-3',
    class_id: 'geography-11-class-id',
    overall_score: 86.8,
    total_points_earned: 156,
    total_points_possible: 180,
    created_at: '2024-03-05',
    ai_feedback: 'Consistent performance across all geography topics. Shows improvement in resource consumption analysis.',
    detailed_analysis: 'Pablo maintains strong performance across all geography units. His ability to connect different geographical concepts is developing well.'
  }
];

// BETTY JOHNSON MOCK DATA
export const mockBettyContentSkillScores: SkillScore[] = [
  // MATH - ALGEBRA AND FUNCTIONS
  { id: 'betty-mock-1', test_result_id: 'betty-test-1', skill_name: 'Factoring Polynomials', score: 92, points_earned: 18, points_possible: 20, created_at: '2024-01-20' },
  { id: 'betty-mock-2', test_result_id: 'betty-test-1', skill_name: 'Solving Systems of Equations', score: 88, points_earned: 22, points_possible: 25, created_at: '2024-01-20' },
  { id: 'betty-mock-3', test_result_id: 'betty-test-1', skill_name: 'Understanding Function Notation', score: 84, points_earned: 20, points_possible: 24, created_at: '2024-01-20' },
  { id: 'betty-mock-4', test_result_id: 'betty-test-2', skill_name: 'Graphing Linear and Quadratic Functions', score: 95, points_earned: 24, points_possible: 25, created_at: '2024-02-20' },
  { id: 'betty-mock-5', test_result_id: 'betty-test-2', skill_name: 'Working with Exponential Functions', score: 87, points_earned: 17, points_possible: 20, created_at: '2024-02-20' },
  
  // MATH - GEOMETRY
  { id: 'betty-mock-6', test_result_id: 'betty-test-1', skill_name: 'Properties of Similar Triangles', score: 89, points_earned: 18, points_possible: 20, created_at: '2024-01-20' },
  { id: 'betty-mock-7', test_result_id: 'betty-test-1', skill_name: 'Area and Perimeter Calculations', score: 93, points_earned: 19, points_possible: 20, created_at: '2024-01-20' },
  { id: 'betty-mock-8', test_result_id: 'betty-test-2', skill_name: 'Volume and Surface Area of 3D Objects', score: 91, points_earned: 22, points_possible: 24, created_at: '2024-02-20' },
  { id: 'betty-mock-9', test_result_id: 'betty-test-2', skill_name: 'Coordinate Geometry', score: 86, points_earned: 21, points_possible: 24, created_at: '2024-02-20' },
  
  // SCIENCE - BIOLOGY
  { id: 'betty-mock-10', test_result_id: 'betty-sci-test-1', skill_name: 'Cell Structure and Function', score: 94, points_earned: 19, points_possible: 20, created_at: '2024-01-25' },
  { id: 'betty-mock-11', test_result_id: 'betty-sci-test-1', skill_name: 'Genetics and Heredity', score: 87, points_earned: 21, points_possible: 24, created_at: '2024-01-25' },
  { id: 'betty-mock-12', test_result_id: 'betty-sci-test-1', skill_name: 'Ecosystem Interactions', score: 90, points_earned: 18, points_possible: 20, created_at: '2024-01-25' },
  { id: 'betty-mock-13', test_result_id: 'betty-sci-test-2', skill_name: 'Evolution and Natural Selection', score: 92, points_earned: 22, points_possible: 24, created_at: '2024-02-25' },
  { id: 'betty-mock-14', test_result_id: 'betty-sci-test-2', skill_name: 'Photosynthesis and Cellular Respiration', score: 88, points_earned: 18, points_possible: 20, created_at: '2024-02-25' },
  
  // ENGLISH - LITERATURE AND COMPOSITION
  { id: 'betty-mock-15', test_result_id: 'betty-eng-test-1', skill_name: 'Literary Analysis and Interpretation', score: 96, points_earned: 23, points_possible: 24, created_at: '2024-01-30' },
  { id: 'betty-mock-16', test_result_id: 'betty-eng-test-1', skill_name: 'Character Development Analysis', score: 91, points_earned: 18, points_possible: 20, created_at: '2024-01-30' },
  { id: 'betty-mock-17', test_result_id: 'betty-eng-test-1', skill_name: 'Theme and Symbolism Recognition', score: 89, points_earned: 21, points_possible: 24, created_at: '2024-01-30' },
  { id: 'betty-mock-18', test_result_id: 'betty-eng-test-2', skill_name: 'Essay Writing and Structure', score: 94, points_earned: 19, points_possible: 20, created_at: '2024-03-01' },
  { id: 'betty-mock-19', test_result_id: 'betty-eng-test-2', skill_name: 'Grammar and Mechanics', score: 97, points_earned: 23, points_possible: 24, created_at: '2024-03-01' },
  
  // HISTORY - WORLD HISTORY
  { id: 'betty-mock-20', test_result_id: 'betty-hist-test-1', skill_name: 'Analyzing Primary Sources', score: 85, points_earned: 17, points_possible: 20, created_at: '2024-02-05' },
  { id: 'betty-mock-21', test_result_id: 'betty-hist-test-1', skill_name: 'Understanding Historical Context', score: 88, points_earned: 21, points_possible: 24, created_at: '2024-02-05' },
  { id: 'betty-mock-22', test_result_id: 'betty-hist-test-1', skill_name: 'Cause and Effect Relationships', score: 92, points_earned: 18, points_possible: 20, created_at: '2024-02-05' },
  { id: 'betty-mock-23', test_result_id: 'betty-hist-test-2', skill_name: 'Comparing Civilizations', score: 90, points_earned: 22, points_possible: 24, created_at: '2024-03-05' },
  { id: 'betty-mock-24', test_result_id: 'betty-hist-test-2', skill_name: 'Historical Timeline Construction', score: 86, points_earned: 17, points_possible: 20, created_at: '2024-03-05' },
];

export const mockBettySubjectSkillScores: SkillScore[] = [
  // MATHEMATICAL REASONING
  { id: 'betty-subj-1', test_result_id: 'betty-test-1', skill_name: 'Problem-solving strategies', score: 91, points_earned: 23, points_possible: 25, created_at: '2024-01-20' },
  { id: 'betty-subj-2', test_result_id: 'betty-test-1', skill_name: 'Mathematical communication', score: 88, points_earned: 22, points_possible: 25, created_at: '2024-01-20' },
  { id: 'betty-subj-3', test_result_id: 'betty-test-2', skill_name: 'Logical reasoning', score: 93, points_earned: 19, points_possible: 20, created_at: '2024-02-20' },
  { id: 'betty-subj-4', test_result_id: 'betty-test-2', skill_name: 'Critical thinking', score: 87, points_earned: 17, points_possible: 20, created_at: '2024-02-20' },
  
  // COMPUTATIONAL FLUENCY
  { id: 'betty-subj-5', test_result_id: 'betty-test-1', skill_name: 'Mental math skills', score: 85, points_earned: 20, points_possible: 24, created_at: '2024-01-20' },
  { id: 'betty-subj-6', test_result_id: 'betty-test-2', skill_name: 'Calculator usage', score: 92, points_earned: 18, points_possible: 20, created_at: '2024-02-20' },
  { id: 'betty-subj-7', test_result_id: 'betty-test-3', skill_name: 'Estimation techniques', score: 89, points_earned: 21, points_possible: 24, created_at: '2024-03-10' },
  
  // SCIENTIFIC INQUIRY
  { id: 'betty-subj-8', test_result_id: 'betty-sci-test-1', skill_name: 'Hypothesis formation', score: 94, points_earned: 23, points_possible: 24, created_at: '2024-01-25' },
  { id: 'betty-subj-9', test_result_id: 'betty-sci-test-1', skill_name: 'Experimental design', score: 90, points_earned: 18, points_possible: 20, created_at: '2024-01-25' },
  { id: 'betty-subj-10', test_result_id: 'betty-sci-test-2', skill_name: 'Data analysis and interpretation', score: 92, points_earned: 22, points_possible: 24, created_at: '2024-02-25' },
  
  // LANGUAGE ARTS COMMUNICATION
  { id: 'betty-subj-11', test_result_id: 'betty-eng-test-1', skill_name: 'Written expression', score: 95, points_earned: 19, points_possible: 20, created_at: '2024-01-30' },
  { id: 'betty-subj-12', test_result_id: 'betty-eng-test-1', skill_name: 'Reading comprehension', score: 93, points_earned: 22, points_possible: 24, created_at: '2024-01-30' },
  { id: 'betty-subj-13', test_result_id: 'betty-eng-test-2', skill_name: 'Oral presentation', score: 88, points_earned: 18, points_possible: 20, created_at: '2024-03-01' },
  
  // HISTORICAL THINKING
  { id: 'betty-subj-14', test_result_id: 'betty-hist-test-1', skill_name: 'Historical analysis', score: 87, points_earned: 21, points_possible: 24, created_at: '2024-02-05' },
  { id: 'betty-subj-15', test_result_id: 'betty-hist-test-1', skill_name: 'Evidence evaluation', score: 91, points_earned: 18, points_possible: 20, created_at: '2024-02-05' },
  { id: 'betty-subj-16', test_result_id: 'betty-hist-test-2', skill_name: 'Historical argumentation', score: 89, points_earned: 21, points_possible: 24, created_at: '2024-03-05' },
];

export const mockBettyTestResults = [
  {
    id: 'betty-test-result-1',
    student_id: 'betty-student-id',
    exam_id: 'math-exam-1',
    class_id: 'math-10-class-id',
    overall_score: 89.7,
    total_points_earned: 179,
    total_points_possible: 200,
    created_at: '2024-01-20',
    ai_feedback: 'Excellent performance in algebra and geometry. Shows strong mathematical reasoning skills.',
    detailed_analysis: 'Betty demonstrates exceptional understanding of mathematical concepts with particularly strong performance in geometric calculations and algebraic problem-solving.'
  },
  {
    id: 'betty-test-result-2',
    student_id: 'betty-student-id',
    exam_id: 'math-exam-2',
    class_id: 'math-10-class-id',
    overall_score: 91.3,
    total_points_earned: 197,
    total_points_possible: 216,
    created_at: '2024-02-20',
    ai_feedback: 'Outstanding work on advanced functions and coordinate geometry. Maintains high standard across all topics.',
    detailed_analysis: 'Betty shows consistent improvement and mastery of complex mathematical concepts. Her graphing skills are particularly noteworthy.'
  },
  {
    id: 'betty-sci-test-result-1',
    student_id: 'betty-student-id',
    exam_id: 'bio-exam-1',
    class_id: 'biology-11-class-id',
    overall_score: 90.8,
    total_points_earned: 163,
    total_points_possible: 180,
    created_at: '2024-01-25',
    ai_feedback: 'Strong grasp of biological concepts, particularly cell biology and ecosystems.',
    detailed_analysis: 'Betty excels in understanding complex biological processes and shows excellent analytical skills in ecosystem studies.'
  },
  {
    id: 'betty-eng-test-result-1',
    student_id: 'betty-student-id',
    exam_id: 'lit-exam-1',
    class_id: 'english-11-class-id',
    overall_score: 93.2,
    total_points_earned: 168,
    total_points_possible: 180,
    created_at: '2024-01-30',
    ai_feedback: 'Exceptional literary analysis skills with sophisticated understanding of themes and symbolism.',
    detailed_analysis: 'Betty demonstrates advanced critical thinking in literature with excellent written expression and deep analytical insights.'
  },
  {
    id: 'betty-hist-test-result-1',
    student_id: 'betty-student-id',
    exam_id: 'hist-exam-1',
    class_id: 'history-10-class-id',
    overall_score: 88.1,
    total_points_earned: 159,
    total_points_possible: 180,
    created_at: '2024-02-05',
    ai_feedback: 'Good historical analysis with room for improvement in primary source interpretation.',
    detailed_analysis: 'Betty shows solid understanding of historical concepts and demonstrates good analytical skills in comparing civilizations and understanding cause-effect relationships.'
  }
];

// Geography skills for Betty (if needed for specific geography classes)
export const mockBettyGeographyContentSkillScores = [
  // PHYSICAL GEOGRAPHY - Natural Systems
  { id: 'betty-geo-1', test_result_id: 'betty-geo-test', skill_name: 'Climate and Weather Patterns', score: 78, points_earned: 39, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-2', test_result_id: 'betty-geo-test', skill_name: 'Landform Formation and Processes', score: 82, points_earned: 41, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-3', test_result_id: 'betty-geo-test', skill_name: 'Water Cycle and Hydrology', score: 75, points_earned: 37, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-4', test_result_id: 'betty-geo-test', skill_name: 'Ecosystem Interactions', score: 88, points_earned: 44, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-5', test_result_id: 'betty-geo-test', skill_name: 'Natural Hazards and Disasters', score: 73, points_earned: 36, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },

  // HUMAN GEOGRAPHY - Population and Settlement
  { id: 'betty-geo-6', test_result_id: 'betty-geo-test', skill_name: 'Population Distribution and Demographics', score: 85, points_earned: 42, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-7', test_result_id: 'betty-geo-test', skill_name: 'Urban and Rural Settlement Patterns', score: 79, points_earned: 39, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-8', test_result_id: 'betty-geo-test', skill_name: 'Migration Patterns and Causes', score: 81, points_earned: 40, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-9', test_result_id: 'betty-geo-test', skill_name: 'Cultural Landscapes and Identity', score: 77, points_earned: 38, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },

  // ECONOMIC GEOGRAPHY - Resources and Development
  { id: 'betty-geo-10', test_result_id: 'betty-geo-test', skill_name: 'Natural Resource Management', score: 71, points_earned: 35, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-11', test_result_id: 'betty-geo-test', skill_name: 'Economic Development Patterns', score: 74, points_earned: 37, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-12', test_result_id: 'betty-geo-test', skill_name: 'Trade and Globalization', score: 83, points_earned: 41, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-13', test_result_id: 'betty-geo-test', skill_name: 'Agriculture and Food Systems', score: 76, points_earned: 38, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },

  // ENVIRONMENTAL GEOGRAPHY - Sustainability
  { id: 'betty-geo-14', test_result_id: 'betty-geo-test', skill_name: 'Environmental Conservation', score: 89, points_earned: 44, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-15', test_result_id: 'betty-geo-test', skill_name: 'Climate Change Impacts', score: 87, points_earned: 43, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-16', test_result_id: 'betty-geo-test', skill_name: 'Sustainable Development Goals', score: 84, points_earned: 42, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-17', test_result_id: 'betty-geo-test', skill_name: 'Human-Environment Interactions', score: 80, points_earned: 40, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },

  // GEOSPATIAL SKILLS - Analysis and Technology
  { id: 'betty-geo-18', test_result_id: 'betty-geo-test', skill_name: 'Map Reading and Interpretation', score: 92, points_earned: 46, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-19', test_result_id: 'betty-geo-test', skill_name: 'Geographic Information Systems (GIS)', score: 68, points_earned: 34, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-20', test_result_id: 'betty-geo-test', skill_name: 'Spatial Analysis and Patterns', score: 72, points_earned: 36, points_possible: 50, created_at: '2024-12-15T10:00:00Z' }
];

// Betty Johnson's Geography 11 Subject Skills - Updated to match curriculum
export const mockBettyGeographySubjectSkillScores = [
  { id: 'betty-geo-sub-1', test_result_id: 'betty-geo-test', skill_name: 'Geographic Inquiry and Research', score: 81, points_earned: 40, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-sub-2', test_result_id: 'betty-geo-test', skill_name: 'Spatial Thinking and Analysis', score: 75, points_earned: 37, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-sub-3', test_result_id: 'betty-geo-test', skill_name: 'Data Collection and Interpretation', score: 86, points_earned: 43, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-sub-4', test_result_id: 'betty-geo-test', skill_name: 'Critical Analysis of Geographic Issues', score: 78, points_earned: 39, points_possible: 50, created_at: '2024-12-15T10:00:00Z' },
  { id: 'betty-geo-sub-5', test_result_id: 'betty-geo-test', skill_name: 'Communication of Geographic Concepts', score: 84, points_earned: 42, points_possible: 50, created_at: '2024-12-15T10:00:00Z' }
];
