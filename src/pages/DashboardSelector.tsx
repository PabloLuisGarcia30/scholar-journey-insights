
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, BookOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardSelector() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">EduPlatform</h1>
          <p className="text-slate-600">Choose your dashboard to continue</p>
          <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full inline-block">
            Development Mode - Authentication Disabled
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teacher Dashboard */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                Teacher Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Access the full teacher interface with student management, class overview, and analytics.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="h-4 w-4" />
                  Student Directory & Class Management
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                  Test Creation & Quiz Tools
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  Analytics & Performance Tracking
                </div>
              </div>

              <Button asChild className="w-full">
                <Link to="/?role=teacher">
                  Access Teacher Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Student Dashboard */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                Student Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Access the student interface with assignments, progress tracking, and learning tools.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="h-4 w-4" />
                  View Assignments & Progress
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                  Learning Profile & Analytics
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  Upload Tests & Submissions
                </div>
              </div>

              <Button asChild className="w-full" variant="outline">
                <Link to="/student-dashboard?role=student">
                  Access Student Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            To re-enable authentication, set <code>DISABLE_AUTH_FOR_DEV</code> to <code>false</code> in <code>src/config/constants.ts</code>
          </p>
        </div>
      </div>
    </div>
  );
}
