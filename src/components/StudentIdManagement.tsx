
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Users, IdCard } from "lucide-react";
import { StudentIdGenerationService } from "@/services/studentIdGenerationService";
import { getAllActiveStudents } from "@/services/examService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StudentIdManagement() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsWithoutIds, setStudentsWithoutIds] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStudentStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get all active students
      const activeStudents = await getAllActiveStudents();
      setStudents(activeStudents);

      // Get student profiles without Student IDs
      const { data: profilesWithoutIds, error } = await supabase
        .from('student_profiles')
        .select('id, student_name, email')
        .is('student_id', null);

      if (error) {
        console.error('Error fetching students without IDs:', error);
        toast.error('Failed to load student statistics');
        return;
      }

      setStudentsWithoutIds(profilesWithoutIds || []);
    } catch (error) {
      console.error('Error loading student stats:', error);
      toast.error('Failed to load student statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleBackfillStudentIds = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting Student ID backfill process...');
      
      await StudentIdGenerationService.backfillMissingStudentIds();
      
      toast.success('Successfully assigned Student IDs to all students!');
      
      // Refresh the stats
      await loadStudentStats();
    } catch (error) {
      console.error('Error during backfill:', error);
      toast.error('Failed to assign Student IDs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student ID Management</h2>
          <p className="text-gray-600">Manage and assign Student IDs to existing students</p>
        </div>
        <Button onClick={loadStudentStats} disabled={loadingStats}>
          {loadingStats ? 'Loading...' : 'Refresh Stats'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Active students in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Student IDs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{studentsWithoutIds.length}</div>
            <p className="text-xs text-muted-foreground">Students without assigned IDs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Student IDs</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {students.length - studentsWithoutIds.length}
            </div>
            <p className="text-xs text-muted-foreground">Students with assigned IDs</p>
          </CardContent>
        </Card>
      </div>

      {studentsWithoutIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Students Missing Student IDs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                The following students in the student_profiles table do not have Student IDs assigned:
              </p>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {studentsWithoutIds.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-gray-600">{student.email || 'No email'}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      No ID
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleBackfillStudentIds} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning Student IDs...
                    </>
                  ) : (
                    <>
                      <IdCard className="h-4 w-4 mr-2" />
                      Assign Student IDs to All ({studentsWithoutIds.length}) Students
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This will automatically generate unique Student IDs for all students without them
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {studentsWithoutIds.length === 0 && students.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Students Have Student IDs!</h3>
              <p className="text-gray-600">Every student in the system has been assigned a unique Student ID.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
