import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Link, Calendar, Users, ExternalLink, Upload, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllActiveClasses, getExamByExamId, type ActiveClass, type StoredExam } from '@/services/examService';
import { ShareableLinkCard } from '@/components/ShareableLinkCard';
import { APP_URLS, APP_CONFIG, MESSAGES } from '@/config/constants';

interface QuizLink {
  id: string;
  token: string;
  title: string;
  exam_id: string;
  class_id: string;
  teacher_name: string;
  expires_at: string;
  max_attempts: number;
  current_attempts: number;
  is_active: boolean;
  created_at: string;
}

export default function CreateQuizLink() {
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [examId, setExamId] = useState('');
  const [examData, setExamData] = useState<StoredExam | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [generatedLinks, setGeneratedLinks] = useState<QuizLink[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClasses();
    loadExistingLinks();
  }, []);

  const loadClasses = async () => {
    try {
      const classData = await getAllActiveClasses();
      setClasses(classData);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: "Error loading classes",
        description: "Could not load class information.",
        variant: "destructive",
      });
    }
  };

  const loadExistingLinks = async () => {
    // This would typically fetch from the database
    // For now, we'll start with an empty array
    setGeneratedLinks([]);
  };

  const handleExamIdChange = async (value: string) => {
    setExamId(value);
    if (value.trim()) {
      try {
        const exam = await getExamByExamId(value.trim());
        if (exam) {
          setExamData(exam);
          setTitle(exam.title);
          setDescription(exam.description || '');
        } else {
          setExamData(null);
          toast({
            title: "Exam not found",
            description: "No exam found with that ID. You can still create a quiz link.",
          });
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
        setExamData(null);
      }
    } else {
      setExamData(null);
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  };

  const handleGenerateLink = async () => {
    if (!title.trim() || !teacherName.trim() || !selectedClass) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // In a real implementation, this would save to the database
      // For now, we'll simulate the creation
      const newLink: QuizLink = {
        id: Math.random().toString(),
        token,
        title: title.trim(),
        exam_id: examId.trim() || '',
        class_id: selectedClass,
        teacher_name: teacherName.trim(),
        expires_at: expiresAt.toISOString(),
        max_attempts: maxAttempts,
        current_attempts: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      setGeneratedLinks(prev => [newLink, ...prev]);

      toast({
        title: "Quiz link generated!",
        description: "Your quiz link has been created successfully.",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setExamId('');
      setExamData(null);
      setSelectedClass('');

    } catch (error) {
      console.error('Error generating link:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate quiz link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The quiz link has been copied to your clipboard.",
    });
  };

  const getQuizUrl = (token: string) => {
    return `${window.location.origin}/student-quiz/${token}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Online Test or Quiz
          </h1>
          <p className="text-gray-600">
            Generate secure links for students to take tests online
          </p>
        </div>

        {/* Student Upload Portal Section */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  General Student Upload Portal
                </h3>
                <p className="text-blue-700 mb-4">
                  For general test uploads without restrictions, share the student upload portal. 
                  Students can upload any test paper for automatic grading.
                </p>
                <div className="max-w-md">
                  <ShareableLinkCard
                    title={APP_CONFIG.STUDENT_PORTAL_NAME}
                    description="No time limits or attempt restrictions"
                    url={APP_URLS.STUDENT_UPLOAD_URL}
                    icon={<Upload className="h-4 w-4" />}
                    showQrCode={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Generate Custom Quiz Link
              </CardTitle>
              <p className="text-sm text-gray-600">
                Create time-limited quiz links with attempt restrictions
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacherName">Teacher Name *</Label>
                <Input
                  id="teacherName"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Select Class *</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.subject} {cls.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="examId">Exam ID (optional)</Label>
                <Input
                  id="examId"
                  value={examId}
                  onChange={(e) => handleExamIdChange(e.target.value)}
                  placeholder="Enter exam ID for automatic grading"
                />
                {examData && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-700">
                      ✓ Exam found: {examData.title}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter quiz title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter quiz description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires in (days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attempts">Max Attempts</Label>
                  <Input
                    id="attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? "Generating..." : "Generate Custom Quiz Link"}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Generated Custom Quiz Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedLinks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom quiz links generated yet</p>
                  <p className="text-sm">Create your first custom quiz link to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedLinks.map((link) => (
                    <div key={link.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{link.title}</h4>
                          <p className="text-sm text-gray-600">
                            Class: {classes.find(c => c.id === link.class_id)?.name || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={link.is_active ? "default" : "secondary"}>
                            {link.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        Expires: {new Date(link.expires_at).toLocaleDateString()}
                      </div>

                      <div className="p-2 bg-gray-50 rounded border text-sm font-mono break-all">
                        {getQuizUrl(link.token)}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(getQuizUrl(link.token))}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={getQuizUrl(link.token)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
