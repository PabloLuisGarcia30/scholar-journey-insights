
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CreateClassDialogProps {
  onCreateClass: (classData: {
    name: string;
    subject: string;
    grade: string;
    teacher: string;
    teacherId: string;
    daysOfWeek?: string[];
    classTime?: string;
    endTime?: string;
  }) => void;
}

export function CreateClassDialog({ onCreateClass }: CreateClassDialogProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    grade: '',
    daysOfWeek: [] as string[],
    classTime: '',
    endTime: ''
  });

  const subjects = ['Math', 'Science', 'English', 'History', 'Geography', 'Art', 'Music', 'Physical Education'];
  const grades = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: checked 
        ? [...prev.daysOfWeek, day]
        : prev.daysOfWeek.filter(d => d !== day)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.subject && formData.grade && profile) {
      const classData = {
        name: formData.name,
        subject: formData.subject,
        grade: formData.grade,
        teacher: profile.full_name || profile.email || 'Unknown Teacher',
        teacherId: profile.id,
        ...(formData.daysOfWeek.length > 0 && { daysOfWeek: formData.daysOfWeek }),
        ...(formData.classTime && { classTime: formData.classTime }),
        ...(formData.endTime && { endTime: formData.endTime })
      };
      
      console.log('Submitting class data:', classData);
      onCreateClass(classData);
      setFormData({ name: '', subject: '', grade: '', daysOfWeek: [], classTime: '', endTime: '' });
      setOpen(false);
    }
  };

  if (!profile) {
    return null; // Don't show dialog if user not authenticated
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class to organize your students. You are creating this class as {profile.full_name || profile.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Class Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Math Grade 6"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grade" className="text-right">
                Grade
              </Label>
              <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Days of Week
              </Label>
              <div className="col-span-3 space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Select multiple days (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={formData.daysOfWeek.includes(day)}
                        onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
                      />
                      <Label 
                        htmlFor={day} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.daysOfWeek.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {formData.daysOfWeek.join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="classTime" className="text-right">
                Start Time
              </Label>
              <Input
                id="classTime"
                type="time"
                value={formData.classTime}
                onChange={(e) => setFormData({ ...formData, classTime: e.target.value })}
                className="col-span-3"
                placeholder="e.g., 09:00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="col-span-3"
                placeholder="e.g., 10:00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Class</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
