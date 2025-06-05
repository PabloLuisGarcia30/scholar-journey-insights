
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
