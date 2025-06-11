
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TopPerformersProps {
  onSelectStudent: (studentId: string) => void;
}

export function TopPerformers({ onSelectStudent }: TopPerformersProps) {
  const { user } = useAuth();

  // Fetch real authenticated users with high performance
  const { data: topStudents = [], isLoading } = useQuery({
    queryKey: ['topPerformers'],
    queryFn: async () => {
      // Get authenticated users with their average scores
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .limit(5);

      if (error) {
        console.error('Error fetching top performers:', error);
        return [];
      }

      // Calculate average scores for each student
      const studentsWithScores = await Promise.all(
        profiles.map(async (profile) => {
          // Get content skill scores
          const { data: contentSkills } = await supabase.rpc('get_authenticated_user_content_skills', {
            auth_user_id: profile.id
          });

          // Get subject skill scores  
          const { data: subjectSkills } = await supabase.rpc('get_authenticated_user_subject_skills', {
            auth_user_id: profile.id
          });

          const allScores = [
            ...(contentSkills || []).map(s => s.score),
            ...(subjectSkills || []).map(s => s.score)
          ];

          const avgScore = allScores.length > 0 
            ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
            : 0;

          const grade = avgScore >= 90 ? 'A+' : 
                       avgScore >= 85 ? 'A' : 
                       avgScore >= 80 ? 'A-' : 
                       avgScore >= 75 ? 'B+' : 'B';

          return {
            id: profile.id,
            name: profile.full_name || profile.email || 'Student',
            gpa: Number((avgScore / 25).toFixed(2)), // Convert to 4.0 scale approximation
            grade,
            avgScore
          };
        })
      );

      // Sort by average score and return top 5
      return studentsWithScores
        .filter(student => student.avgScore > 0) // Only show students with data
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200"></div>
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div>
                <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
                <div className="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="w-12 h-6 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (topStudents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No student performance data available yet.</p>
        <p className="text-sm text-gray-400 mt-1">Students will appear here after completing assessments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topStudents.map((student, index) => (
        <div 
          key={student.id} 
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => onSelectStudent(student.id)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
              {index + 1}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{student.name}</p>
              <p className="text-xs text-gray-500">Avg: {Math.round(student.avgScore)}%</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              student.avgScore >= 85 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {student.grade}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
