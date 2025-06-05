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

// Mock content skill scores for Betty Johnson in Grade 10 Math
export const mockBettyContentSkillScores = [
  // ALGEBRA AND FUNCTIONS
  {
    id: 'mock-1',
    test_result_id: 'mock-test-1',
    skill_name: 'Factoring Polynomials',
    score: 85,
    points_earned: 17,
    points_possible: 20,
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'mock-2',
    test_result_id: 'mock-test-1',
    skill_name: 'Solving Systems of Equations',
    score: 78,
    points_earned: 23,
    points_possible: 30,
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'mock-3',
    test_result_id: 'mock-test-2',
    skill_name: 'Understanding Function Notation',
    score: 92,
    points_earned: 18,
    points_possible: 20,
    created_at: '2025-01-16T14:30:00Z'
  },
  {
    id: 'mock-4',
    test_result_id: 'mock-test-2',
    skill_name: 'Graphing Linear and Quadratic Functions',
    score: 88,
    points_earned: 22,
    points_possible: 25,
    created_at: '2025-01-16T14:30:00Z'
  },
  {
    id: 'mock-5',
    test_result_id: 'mock-test-3',
    skill_name: 'Working with Exponential Functions',
    score: 74,
    points_earned: 37,
    points_possible: 50,
    created_at: '2025-01-18T09:15:00Z'
  },

  // GEOMETRY
  {
    id: 'mock-6',
    test_result_id: 'mock-test-1',
    skill_name: 'Properties of Similar Triangles',
    score: 91,
    points_earned: 27,
    points_possible: 30,
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'mock-7',
    test_result_id: 'mock-test-2',
    skill_name: 'Area and Perimeter Calculations',
    score: 95,
    points_earned: 19,
    points_possible: 20,
    created_at: '2025-01-16T14:30:00Z'
  },
  {
    id: 'mock-8',
    test_result_id: 'mock-test-3',
    skill_name: 'Volume and Surface Area of 3D Objects',
    score: 82,
    points_earned: 33,
    points_possible: 40,
    created_at: '2025-01-18T09:15:00Z'
  },
  {
    id: 'mock-9',
    test_result_id: 'mock-test-4',
    skill_name: 'Coordinate Geometry',
    score: 79,
    points_earned: 24,
    points_possible: 30,
    created_at: '2025-01-20T11:45:00Z'
  },
  {
    id: 'mock-10',
    test_result_id: 'mock-test-4',
    skill_name: 'Geometric Transformations',
    score: 86,
    points_earned: 21,
    points_possible: 25,
    created_at: '2025-01-20T11:45:00Z'
  },

  // TRIGONOMETRY
  {
    id: 'mock-11',
    test_result_id: 'mock-test-5',
    skill_name: 'Basic Trigonometric Ratios',
    score: 73,
    points_earned: 22,
    points_possible: 30,
    created_at: '2025-01-22T13:20:00Z'
  },
  {
    id: 'mock-12',
    test_result_id: 'mock-test-5',
    skill_name: 'Solving Right Triangle Problems',
    score: 87,
    points_earned: 26,
    points_possible: 30,
    created_at: '2025-01-22T13:20:00Z'
  },
  {
    id: 'mock-13',
    test_result_id: 'mock-test-6',
    skill_name: 'Unit Circle and Angle Measures',
    score: 69,
    points_earned: 14,
    points_possible: 20,
    created_at: '2025-01-24T15:10:00Z'
  },
  {
    id: 'mock-14',
    test_result_id: 'mock-test-6',
    skill_name: 'Trigonometric Identities',
    score: 76,
    points_earned: 19,
    points_possible: 25,
    created_at: '2025-01-24T15:10:00Z'
  },
  {
    id: 'mock-15',
    test_result_id: 'mock-test-7',
    skill_name: 'Applications of Trigonometry',
    score: 84,
    points_earned: 42,
    points_possible: 50,
    created_at: '2025-01-26T10:30:00Z'
  },

  // DATA ANALYSIS AND PROBABILITY
  {
    id: 'mock-16',
    test_result_id: 'mock-test-8',
    skill_name: 'Statistical Measures and Interpretation',
    score: 90,
    points_earned: 27,
    points_possible: 30,
    created_at: '2025-01-28T14:45:00Z'
  },
  {
    id: 'mock-17',
    test_result_id: 'mock-test-8',
    skill_name: 'Probability Calculations',
    score: 81,
    points_earned: 16,
    points_possible: 20,
    created_at: '2025-01-28T14:45:00Z'
  },
  {
    id: 'mock-18',
    test_result_id: 'mock-test-9',
    skill_name: 'Data Collection and Sampling',
    score: 77,
    points_earned: 23,
    points_possible: 30,
    created_at: '2025-01-30T09:00:00Z'
  },
  {
    id: 'mock-19',
    test_result_id: 'mock-test-9',
    skill_name: 'Creating and Interpreting Graphs',
    score: 93,
    points_earned: 37,
    points_possible: 40,
    created_at: '2025-01-30T09:00:00Z'
  },
  {
    id: 'mock-20',
    test_result_id: 'mock-test-10',
    skill_name: 'Making Predictions from Data',
    score: 75,
    points_earned: 30,
    points_possible: 40,
    created_at: '2025-02-01T12:15:00Z'
  },

  // PROBLEM SOLVING AND REASONING
  {
    id: 'mock-21',
    test_result_id: 'mock-test-11',
    skill_name: 'Mathematical Modeling',
    score: 68,
    points_earned: 20,
    points_possible: 30,
    created_at: '2025-02-03T16:30:00Z'
  },
  {
    id: 'mock-22',
    test_result_id: 'mock-test-11',
    skill_name: 'Critical Thinking in Mathematics',
    score: 89,
    points_earned: 44,
    points_possible: 50,
    created_at: '2025-02-03T16:30:00Z'
  },
  {
    id: 'mock-23',
    test_result_id: 'mock-test-12',
    skill_name: 'Pattern Recognition',
    score: 94,
    points_earned: 19,
    points_possible: 20,
    created_at: '2025-02-05T11:20:00Z'
  },
  {
    id: 'mock-24',
    test_result_id: 'mock-test-12',
    skill_name: 'Logical Reasoning',
    score: 72,
    points_earned: 18,
    points_possible: 25,
    created_at: '2025-02-05T11:20:00Z'
  },
  {
    id: 'mock-25',
    test_result_id: 'mock-test-13',
    skill_name: 'Problem-Solving Strategies',
    score: 83,
    points_earned: 33,
    points_possible: 40,
    created_at: '2025-02-07T08:45:00Z'
  }
];

// Keep backward compatibility
export const mockPabloContentSkillScores = mockBettyContentSkillScores;
