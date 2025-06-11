
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
import { Plus, Clock } from "lucide-react";

interface CreateClassDialogProps {
  onCreateClass: (classData: {
    name: string;
    subject: string;
    grade: string;
    teacher: string;
    dayOfWeek?: string;
    classTime?: string;
    endTime?: string;
  }) => void;
}

export function CreateClassDialog({ onCreateClass }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    grade: '',
    teacher: '',
    dayOfWeek: '',
    classTime: '',
    endTime: ''
  });

  const subjects = ['Math', 'Science', 'English', 'History', 'Geography', 'Art', 'Music', 'Physical Education'];
  const grades = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Common class time presets
  const timePresets = [
    { label: '8:00 AM', value: '08:00' },
    { label: '8:30 AM', value: '08:30' },
    { label: '9:00 AM', value: '09:00' },
    { label: '9:30 AM', value: '09:30' },
    { label: '10:00 AM', value: '10:00' },
    { label: '10:30 AM', value: '10:30' },
    { label: '11:00 AM', value: '11:00' },
    { label: '11:30 AM', value: '11:30' },
    { label: '12:00 PM', value: '12:00' },
    { label: '12:30 PM', value: '12:30' },
    { label: '1:00 PM', value: '13:00' },
    { label: '1:30 PM', value: '13:30' },
    { label: '2:00 PM', value: '14:00' },
    { label: '2:30 PM', value: '14:30' },
    { label: '3:00 PM', value: '15:00' },
    { label: '3:30 PM', value: '15:30' },
    { label: '4:00 PM', value: '16:00' },
    { label: '4:30 PM', value: '16:30' },
    { label: '5:00 PM', value: '17:00' },
  ];

  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateEndTime = (startTime: string, duration: number = 60) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const handleStartTimeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      classTime: value,
      endTime: prev.endTime || calculateEndTime(value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.subject && formData.grade && formData.teacher) {
      const classData = {
        name: formData.name,
        subject: formData.subject,
        grade: formData.grade,
        teacher: formData.teacher,
        ...(formData.dayOfWeek && { dayOfWeek: formData.dayOfWeek }),
        ...(formData.classTime && { classTime: formData.classTime }),
        ...(formData.endTime && { endTime: formData.endTime })
      };
      onCreateClass(classData);
      setFormData({ name: '', subject: '', grade: '', teacher: '', dayOfWeek: '', classTime: '', endTime: '' });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class to organize your students. Content-specific skills and subject-specific skills will be automatically linked based on the subject and grade you select.
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacher" className="text-right">
                Teacher
              </Label>
              <Input
                id="teacher"
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                placeholder="Teacher name"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dayOfWeek" className="text-right">
                Day of Week
              </Label>
              <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData({ ...formData, dayOfWeek: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select day (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Enhanced Start Time Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="classTime" className="text-right">
                Start Time
              </Label>
              <div className="col-span-3 space-y-2">
                <Select value={formData.classTime} onValueChange={handleStartTimeChange}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Select start time">
                        {formData.classTime && formatTimeDisplay(formData.classTime)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {timePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500">
                  Or enter custom time:
                  <Input
                    type="time"
                    value={formData.classTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="mt-1 text-sm"
                    placeholder="Custom time"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced End Time Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                End Time
              </Label>
              <div className="col-span-3 space-y-2">
                <Select value={formData.endTime} onValueChange={(value) => setFormData({ ...formData, endTime: value })}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Select end time">
                        {formData.endTime && formatTimeDisplay(formData.endTime)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {timePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500">
                  Or enter custom time:
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="mt-1 text-sm"
                    placeholder="Custom time"
                  />
                </div>
                {formData.classTime && formData.endTime && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Duration: {(() => {
                      const start = formData.classTime.split(':').map(Number);
                      const end = formData.endTime.split(':').map(Number);
                      const startMinutes = start[0] * 60 + start[1];
                      const endMinutes = end[0] * 60 + end[1];
                      const duration = endMinutes - startMinutes;
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      return `${hours > 0 ? `${hours}h ` : ''}${minutes}min`;
                    })()}
                  </div>
                )}
              </div>
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
