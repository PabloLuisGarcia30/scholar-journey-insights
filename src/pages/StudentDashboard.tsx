import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap, LineChart, User } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { getStudentProfile } from "@/services/examService";
import { TailoredExercises } from "@/components/TailoredExercises";

export default function StudentDashboard() {
  const { isLoading, error, data: user } = useUser();

  const { data: studentProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['studentProfile', user?.id],
    queryFn: () => getStudentProfile(user?.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
            Student Dashboard
          </h1>
          <p className="text-lg text-slate-600 mt-2">
            Welcome, {studentProfile?.name || 'Student'}!
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exercises">Tailored Exercises</TabsTrigger>
            <TabsTrigger value="profile">Learning Profile</TabsTrigger>
            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Class Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Welcome to your dashboard! Here you can access your classes, tailored exercises, learning profile, and track your progress.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercises">
            <TailoredExercises />
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Learning Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileLoading ? (
                  <div>Loading profile...</div>
                ) : (
                  <>
                    <p>
                      <strong>Name:</strong> {studentProfile?.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {studentProfile?.email}
                    </p>
                    <p>
                      <strong>Major:</strong> {studentProfile?.major}
                    </p>
                    <p>
                      <strong>Year:</strong> {studentProfile?.year}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Track your progress and see how you're improving over time.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
