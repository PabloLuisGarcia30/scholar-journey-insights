
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";

interface AddStudentsDialogProps {
  classId: string;
  className: string;
  onAddStudents: (studentIds: string[]) => void;
  enrolledStudentIds: string[];
}

// Mock students data - in a real app this would come from a database
const mockStudents = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  name: `Student ${i + 1}`,
  email: `student${i + 1}@university.edu`,
  gpa: Number((Math.random() * 2 + 2).toFixed(2)),
  year: ['Freshman', 'Sophomore', 'Junior', 'Senior'][Math.floor(Math.random() * 4)],
  major: ['Computer Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry'][Math.floor(Math.random() * 5)]
}));

export function AddStudentsDialog({ classId, className, onAddStudents, enrolledStudentIds }: AddStudentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out already enrolled students
  const availableStudents = mockStudents.filter(student => 
    !enrolledStudentIds.includes(student.id)
  );

  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAddStudents = () => {
    if (selectedStudents.length > 0) {
      onAddStudents(selectedStudents);
      setSelectedStudents([]);
      setSearchTerm('');
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectedStudents([]);
    setSearchTerm('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Students
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Students to {className}</DialogTitle>
          <DialogDescription>
            Select students to add to this class. Only students not already enrolled are shown.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {availableStudents.length === 0 ? 
                  "All students are already enrolled in this class" : 
                  "No students found matching your search"
                }
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => handleStudentToggle(student.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{student.year}</Badge>
                        <span className="text-sm font-medium">GPA: {student.gpa}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {selectedStudents.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleAddStudents}
            disabled={selectedStudents.length === 0}
          >
            Add {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
