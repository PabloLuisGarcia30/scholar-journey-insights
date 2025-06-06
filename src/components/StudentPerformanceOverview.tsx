
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Moon, House, Users, UserCheck, BookOpen, X } from "lucide-react";
import { 
  getAllActiveStudents,
  getStudentContentSkillScores,
  getAllActiveClasses,
  type ActiveStudent,
  type ActiveClass
} from "@/services/examService";

interface SkillScore {
  skill_name: string;
  score: number;
}

interface StudentWithSkills extends ActiveStudent {
  lowestSkills: SkillScore[];
}

// Mock data for students without scores
const generateMockSkills = (): SkillScore[] => {
  const mockSkills = [
    { skill_name: "Factoring Polynomials", score: Math.floor(Math.random() * 30) + 45 },
    { skill_name: "Solving Systems of Equations", score: Math.floor(Math.random() * 30) + 50 },
    { skill_name: "Understanding Function Notation", score: Math.floor(Math.random() * 25) + 40 },
    { skill_name: "Graphing Linear Functions", score: Math.floor(Math.random() * 35) + 55 },
    { skill_name: "Working with Exponential Functions", score: Math.floor(Math.random() * 20) + 35 },
    { skill_name: "Properties of Similar Triangles", score: Math.floor(Math.random() * 30) + 45 },
    { skill_name: "Area and Perimeter Calculations", score: Math.floor(Math.random() * 25) + 50 },
    { skill_name: "Basic Trigonometric Ratios", score: Math.floor(Math.random() * 30) + 40 },
    { skill_name: "Statistical Measures", score: Math.floor(Math.random() * 35) + 45 },
    { skill_name: "Probability Calculations", score: Math.floor(Math.random() * 25) + 55 }
  ];
  
  // Shuffle and take 5 random skills
  const shuffled = mockSkills.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5).sort((a, b) => a.score - b.score);
};

export function StudentPerformanceOverview() {
  const [studentsWithSkills, setStudentsWithSkills] = useState<StudentWithSkills[]>([]);
  const [allStudentsWithSkills, setAllStudentsWithSkills] = useState<StudentWithSkills[]>([]);
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<ActiveClass | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("all_subjects");
  const [selectedClasses, setSelectedClasses] = useState<ActiveClass[]>([]);
  const [viewMode, setViewMode] = useState<'class' | 'subject' | 'multi-class'>('class');
  const [showMultiClassSelector, setShowMultiClassSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get unique subjects from classes
  const availableSubjects = Array.from(new Set(classes.map(c => c.subject))).sort();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load both students and classes
      const [students, classesData] = await Promise.all([
        getAllActiveStudents(),
        getAllActiveClasses()
      ]);
      
      setClasses(classesData);
      
      const studentsWithSkillsData = await Promise.all(
        students.map(async (student) => {
          try {
            const skillScores = await getStudentContentSkillScores(student.id);
            
            let lowestSkills: SkillScore[];
            
            if (skillScores && skillScores.length > 0) {
              // Use real data if available - get the 5 lowest scores
              lowestSkills = skillScores
                .map(score => ({
                  skill_name: score.skill_name,
                  score: score.score
                }))
                .sort((a, b) => a.score - b.score)
                .slice(0, 5);
            } else {
              // Use mock data for students without scores
              lowestSkills = generateMockSkills();
            }

            return {
              ...student,
              lowestSkills
            };
          } catch (error) {
            console.error(`Error fetching skills for student ${student.id}:`, error);
            // Use mock data if there's an error fetching real data
            return {
              ...student,
              lowestSkills: generateMockSkills()
            };
          }
        })
      );

      setAllStudentsWithSkills(studentsWithSkillsData);
      setStudentsWithSkills(studentsWithSkillsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassFilter = (selectedClass: ActiveClass | null) => {
    setSelectedClass(selectedClass);
    setViewMode('class');
    setSelectedSubject("all_subjects");
    setSelectedClasses([]);
    setShowMultiClassSelector(false);
    
    if (!selectedClass) {
      // Show all students
      setStudentsWithSkills(allStudentsWithSkills);
    } else {
      // Filter students by class
      const filteredStudents = allStudentsWithSkills.filter(student => 
        selectedClass.students && selectedClass.students.includes(student.id)
      );
      setStudentsWithSkills(filteredStudents);
    }
  };

  const handleSubjectFilter = (subject: string) => {
    setSelectedSubject(subject);
    setViewMode('subject');
    setSelectedClass(null);
    setSelectedClasses([]);
    setShowMultiClassSelector(false);
    
    if (!subject || subject === "all_subjects") {
      // Show all students
      setStudentsWithSkills(allStudentsWithSkills);
    } else {
      // Filter students by subject - only show students who are in at least one class for this subject
      const subjectClasses = classes.filter(c => c.subject === subject);
      const studentsInSubject = new Set();
      
      subjectClasses.forEach(cls => {
        if (cls.students) {
          cls.students.forEach(studentId => studentsInSubject.add(studentId));
        }
      });
      
      const filteredStudents = allStudentsWithSkills.filter(student => 
        studentsInSubject.has(student.id)
      );
      setStudentsWithSkills(filteredStudents);
    }
  };

  const handleMultiClassSelection = (classItem: ActiveClass, checked: boolean) => {
    let newSelectedClasses: ActiveClass[];
    
    if (checked) {
      newSelectedClasses = [...selectedClasses, classItem];
    } else {
      newSelectedClasses = selectedClasses.filter(c => c.id !== classItem.id);
    }
    
    setSelectedClasses(newSelectedClasses);
    
    // Filter students based on selected classes and aggregate their lowest skills
    if (newSelectedClasses.length === 0) {
      setStudentsWithSkills(allStudentsWithSkills);
    } else {
      const studentsInSelectedClasses = new Set();
      newSelectedClasses.forEach(cls => {
        if (cls.students) {
          cls.students.forEach(studentId => studentsInSelectedClasses.add(studentId));
        }
      });
      
      const filteredStudents = allStudentsWithSkills.filter(student => 
        studentsInSelectedClasses.has(student.id)
      );
      
      // Aggregate skills across all students and find the 5 lowest
      const allSkills: SkillScore[] = [];
      filteredStudents.forEach(student => {
        allSkills.push(...student.lowestSkills);
      });
      
      // Group skills by name and calculate average scores
      const skillAverages: { [key: string]: { total: number; count: number } } = {};
      allSkills.forEach(skill => {
        if (!skillAverages[skill.skill_name]) {
          skillAverages[skill.skill_name] = { total: 0, count: 0 };
        }
        skillAverages[skill.skill_name].total += skill.score;
        skillAverages[skill.skill_name].count += 1;
      });
      
      // Convert to array and sort by average score
      const aggregatedSkills = Object.entries(skillAverages)
        .map(([skill_name, data]) => ({
          skill_name,
          score: Math.round(data.total / data.count)
        }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);
      
      // Update each student to show the top 5 lowest skills across all selected classes
      const updatedStudents = filteredStudents.map(student => ({
        ...student,
        lowestSkills: aggregatedSkills
      }));
      
      setStudentsWithSkills(updatedStudents);
    }
  };

  const handleShowMultiClassSelector = () => {
    console.log('Show multi-class selector clicked');
    setViewMode('multi-class');
    setSelectedClass(null);
    setSelectedSubject("all_subjects");
    setShowMultiClassSelector(true);
    setSelectedClasses([]);
    setStudentsWithSkills(allStudentsWithSkills);
  };

  const getScoreColor = (score: number) => {
    if (score >= 86) return "from-emerald-400 to-emerald-600";
    if (score >= 76) return "from-yellow-400 to-yellow-600";
    if (score >= 61) return "from-orange-400 to-orange-600";
    return "from-red-400 to-red-600";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 86) return "text-emerald-700";
    if (score >= 76) return "text-yellow-700";
    if (score >= 61) return "text-orange-700";
    return "text-red-700";
  };

  const handleCreatePracticeForSeveral = () => {
    console.log('Create practice exercise for several students clicked');
    // TODO: Implement multi-student practice exercise creation
  };

  const handleCreatePracticeForOne = () => {
    console.log('Create practice exercise for one student clicked');
    // TODO: Implement single student practice exercise creation
  };

  const handleShowStudentsSkillsForAllSubjects = () => {
    console.log('Show students skills for all subjects clicked');
    // Reset to show all students with all skills
    setViewMode('subject');
    setSelectedClass(null);
    setSelectedSubject("all_subjects");
    setSelectedClasses([]);
    setShowMultiClassSelector(false);
    setStudentsWithSkills(allStudentsWithSkills);
  };

  const getDisplayTitle = () => {
    let baseTitle = "Your Students: 5 Skills Most Needing Improving This Week";
    
    if (viewMode === 'class' && selectedClass) {
      return `${baseTitle} - ${selectedClass.name}`;
    } else if (viewMode === 'subject' && selectedSubject && selectedSubject !== "all_subjects") {
      return `${baseTitle} - ${selectedSubject} Subject`;
    } else if (viewMode === 'subject' && selectedSubject === "all_subjects") {
      return `${baseTitle} - All Subjects`;
    } else if (viewMode === 'multi-class' && selectedClasses.length > 0) {
      return `${baseTitle} - ${selectedClasses.map(c => c.name).join(', ')}`;
    }
    
    return baseTitle;
  };

  if (loading) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Moon className="h-5 w-5 text-orange-500" />
              Your Students: 5 Skills Most Needing Improving This Week
            </CardTitle>
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                    >
                      <House className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white shadow-lg border">
                    <DropdownMenuItem onClick={() => handleClassFilter(null)}>
                      All Students
                    </DropdownMenuItem>
                    {classes.map((classItem) => (
                      <DropdownMenuItem 
                        key={classItem.id}
                        onClick={() => handleClassFilter(classItem)}
                      >
                        {classItem.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForSeveral}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for several students</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForOne}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for one student</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Show students skills options</p>
                      </TooltipContent>
                    </Tooltip>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                    <DropdownMenuItem onClick={handleShowStudentsSkillsForAllSubjects}>
                      All Subjects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShowMultiClassSelector}>
                      Select Multiple Classes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-3 ml-auto">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-12 w-12 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (studentsWithSkills.length === 0) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Moon className="h-5 w-5 text-orange-500" />
              {getDisplayTitle()}
            </CardTitle>
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                        >
                          <House className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white shadow-lg border">
                        <DropdownMenuItem onClick={() => handleClassFilter(null)}>
                          All Students
                        </DropdownMenuItem>
                        {classes.map((classItem) => (
                          <DropdownMenuItem 
                            key={classItem.id}
                            onClick={() => handleClassFilter(classItem)}
                          >
                            {classItem.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show students by classes</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForSeveral}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for several students</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForOne}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for one student</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Show students skills options</p>
                      </TooltipContent>
                    </Tooltip>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                    <DropdownMenuItem onClick={handleShowStudentsSkillsForAllSubjects}>
                      All Subjects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShowMultiClassSelector}>
                      Select Multiple Classes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipProvider>
          </div>
          
          {/* Subject selector when in subject view mode */}
          {viewMode === 'subject' && (
            <div className="mt-4">
              <Select value={selectedSubject} onValueChange={handleSubjectFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_subjects">All Subjects</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Multi-class selector */}
          {showMultiClassSelector && (
            <div className="mt-4">
              <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">Select Multiple Classes</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMultiClassSelector(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {classes.map((classItem) => (
                    <div key={classItem.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={classItem.id}
                        checked={selectedClasses.some(c => c.id === classItem.id)}
                        onCheckedChange={(checked) => 
                          handleMultiClassSelection(classItem, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={classItem.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {classItem.name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedClasses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-600">
                      Selected: {selectedClasses.map(c => c.name).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Moon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {viewMode === 'class' && selectedClass 
                ? `No Students in ${selectedClass.name}`
                : viewMode === 'subject' && selectedSubject && selectedSubject !== "all_subjects"
                ? `No Students in ${selectedSubject} Subject`
                : viewMode === 'multi-class' && selectedClasses.length > 0
                ? `No Students in Selected Classes`
                : 'No Performance Data'
              }
            </h3>
            <p className="text-gray-600">
              {viewMode === 'class' && selectedClass
                ? 'This class has no students assigned or students need to take tests to see performance data'
                : viewMode === 'subject' && selectedSubject && selectedSubject !== "all_subjects"
                ? `No students are enrolled in ${selectedSubject} classes or need to take tests to see performance data`
                : viewMode === 'multi-class' && selectedClasses.length > 0
                ? 'Selected classes have no students assigned or students need to take tests to see performance data'
                : 'Students need to take tests to see performance data here'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Moon className="h-5 w-5 text-orange-500" />
            {getDisplayTitle()}
          </CardTitle>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                      >
                        <House className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg border">
                      <DropdownMenuItem onClick={() => handleClassFilter(null)}>
                        All Students
                      </DropdownMenuItem>
                      {classes.map((classItem) => (
                        <DropdownMenuItem 
                          key={classItem.id}
                          onClick={() => handleClassFilter(classItem)}
                        >
                          {classItem.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show students by classes</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreatePracticeForSeveral}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create practice exercise for several students</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreatePracticeForOne}
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create practice exercise for one student</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show students skills options</p>
                    </TooltipContent>
                  </Tooltip>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                  <DropdownMenuItem onClick={handleShowStudentsSkillsForAllSubjects}>
                    All Subjects
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShowMultiClassSelector}>
                    Select Multiple Classes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        </div>
        
        {/* Subject selector when in subject view mode */}
        {viewMode === 'subject' && (
          <div className="mt-4">
            <Select value={selectedSubject} onValueChange={handleSubjectFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_subjects">All Subjects</SelectItem>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Multi-class selector */}
        {showMultiClassSelector && (
          <div className="mt-4">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-900">Select Multiple Classes</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMultiClassSelector(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={classItem.id}
                      checked={selectedClasses.some(c => c.id === classItem.id)}
                      onCheckedChange={(checked) => 
                        handleMultiClassSelection(classItem, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={classItem.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {classItem.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedClasses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-600">
                    Selected: {selectedClasses.map(c => c.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-96 w-full">
          <div className="space-y-3 pr-4">
            {studentsWithSkills.map((student) => (
              <div 
                key={student.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-12 w-12 ring-2 ring-slate-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{student.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{student.email || 'No email'}</p>
                  </div>
                </div>
                
                <div className="flex items-end gap-4">
                  {student.lowestSkills.map((skill, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="h-10 text-xs text-slate-600 text-center mb-2 w-16 leading-tight flex items-center justify-center">
                        <span className="line-clamp-2">{skill.skill_name}</span>
                      </div>
                      <div 
                        className={`h-12 w-12 rounded-full bg-gradient-to-br ${getScoreColor(skill.score)} 
                          flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 
                          transition-all duration-200`}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">
                          {skill.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fill remaining slots if less than 5 skills */}
                  {[...Array(Math.max(0, 5 - student.lowestSkills.length))].map((_, index) => (
                    <div key={`empty-${index}`} className="flex flex-col items-center">
                      <div className="h-10 text-xs text-slate-400 text-center mb-2 w-16 leading-tight flex items-center justify-center">
                        <span>No data</span>
                      </div>
                      <div 
                        className="h-12 w-12 rounded-full bg-slate-100 border-2 border-dashed border-slate-300
                          flex items-center justify-center"
                      >
                        <span className="text-xs text-slate-400">—</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
