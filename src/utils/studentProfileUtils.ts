
export const getGradeColor = (grade: string | number) => {
  const numGrade = typeof grade === 'string' ? 
    (grade.startsWith('A') ? 90 : grade.startsWith('B') ? 80 : grade.startsWith('C') ? 70 : 60) : 
    grade;
  
  if (numGrade >= 90) return 'bg-green-100 text-green-700';
  if (numGrade >= 80) return 'bg-blue-100 text-blue-700';
  if (numGrade >= 70) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

export const getMasteryColor = (mastery: number) => {
  if (mastery >= 90) return 'bg-green-100 text-green-700';
  if (mastery >= 80) return 'bg-blue-100 text-blue-700';
  if (mastery >= 70) return 'bg-yellow-100 text-yellow-700';
  if (mastery === 0) return 'bg-gray-100 text-gray-600'; // For untested skills
  return 'bg-red-100 text-red-700';
};

export const calculateOverallGrade = (testResults: any[]) => {
  if (testResults.length === 0) return 0;
  const average = testResults.reduce((sum, result) => sum + result.overall_score, 0) / testResults.length;
  return Math.round(average);
};

export const calculateProgressPercentage = (completedCredits: number, totalCredits: number) => {
  return (completedCredits / totalCredits) * 100;
};
