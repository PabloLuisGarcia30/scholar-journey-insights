
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

// NEW: Mock Geography 11 content skills for Pablo Luis Garcia
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

// NEW: Mock test results for Pablo in Geography context - FIXED with class_id
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
