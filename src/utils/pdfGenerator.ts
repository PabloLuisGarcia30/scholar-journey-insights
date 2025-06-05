
import jsPDF from 'jspdf';

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | boolean;
  points: number;
}

export interface TestData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  questions: Question[];
  studentName?: string;
}

export const generateTestPDF = (testData: TestData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  
  // Header styling with larger, bold title
  pdf.setFontSize(20);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(testData.title, margin, yPosition);
  
  yPosition += 18;
  
  // Student info section with better spacing
  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  if (testData.studentName) {
    pdf.text(`Student: ${testData.studentName}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Class: ${testData.className}`, margin, yPosition);
  } else {
    pdf.text(`Name: _________________ Class: ${testData.className}`, margin, yPosition);
  }
  
  yPosition += 8;
  pdf.text(`Exam ID: ${testData.examId} | Time Limit: ${testData.timeLimit} minutes`, margin, yPosition);
  
  if (testData.description) {
    yPosition += 8;
    pdf.text(`Instructions: ${testData.description}`, margin, yPosition);
  }
  
  yPosition += 15;
  
  // Professional divider line
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.8);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  
  yPosition += 20;
  
  // Questions
  testData.questions.forEach((question, index) => {
    // Check if we need a new page
    const estimatedHeight = question.type === 'multiple-choice' ? 80 : 
                           question.type === 'true-false' ? 60 :
                           question.type === 'essay' ? 100 : 50;
    if (yPosition + estimatedHeight > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Question number and text with improved formatting
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${index + 1}.`, margin, yPosition);
    
    pdf.setFont(undefined, 'normal');
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 15);
    pdf.text(questionLines, margin + 15, yPosition);
    yPosition += questionLines.length * 6 + 12;
    
    // Answer options with drawable circles
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Draw empty circle for shading
        const circleX = margin + 25;
        const circleY = yPosition - 3;
        const circleRadius = 3;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.circle(circleX, circleY, circleRadius, 'S'); // 'S' for stroke only (empty circle)
        
        // Place letter beside the circle
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
        
        // Place option text after letter
        const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 50);
        pdf.text(optionLines, circleX + 18, yPosition);
        yPosition += Math.max(8, optionLines.length * 6);
      });
      yPosition += 8;
    } else if (question.type === 'true-false') {
      // True option with circle
      const trueCircleX = margin + 25;
      const trueCircleY = yPosition - 3;
      const circleRadius = 3;
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.circle(trueCircleX, trueCircleY, circleRadius, 'S');
      
      pdf.setFontSize(10);
      pdf.text('A.', trueCircleX + 8, yPosition);
      pdf.text('True', trueCircleX + 18, yPosition);
      yPosition += 10;
      
      // False option with circle
      const falseCircleX = margin + 25;
      const falseCircleY = yPosition - 3;
      
      pdf.circle(falseCircleX, falseCircleY, circleRadius, 'S');
      pdf.text('B.', falseCircleX + 8, yPosition);
      pdf.text('False', falseCircleX + 18, yPosition);
      yPosition += 15;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Answer:', margin + 20, yPosition);
      yPosition += 10;
      
      // Answer lines
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 3; i++) {
        pdf.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
        yPosition += 12;
      }
      yPosition += 8;
    } else if (question.type === 'essay') {
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Answer:', margin + 20, yPosition);
      yPosition += 10;
      
      // More answer lines for essays
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 8; i++) {
        pdf.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
        yPosition += 12;
      }
      yPosition += 8;
    }
    
    pdf.setTextColor(0, 0, 0); // Reset text color
    
    // Add space between questions
    yPosition += 15;
  });
  
  // Footer on each page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 25, pageHeight - 15);
    pdf.text(testData.examId, margin, pageHeight - 15);
  }
  
  const fileName = testData.studentName 
    ? `${testData.title.replace(/\s+/g, '_')}_${testData.studentName.replace(/\s+/g, '_')}.pdf`
    : `${testData.title.replace(/\s+/g, '_')}.pdf`;
  
  pdf.save(fileName);
};

export const generateStudentTestPDFs = (testData: TestData, studentNames: string[]) => {
  studentNames.forEach(studentName => {
    generateTestPDF({
      ...testData,
      studentName
    });
  });
};

export const generateConsolidatedTestPDF = (testData: TestData, studentNames: string[]) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  
  studentNames.forEach((studentName, studentIndex) => {
    if (studentIndex > 0) {
      pdf.addPage();
    }
    
    let yPosition = margin;
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(testData.title, margin, yPosition);
    
    yPosition += 15;
    
    // Student info line
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Student: ${studentName} | Class: ${testData.className}`, margin, yPosition);
    
    yPosition += 8;
    pdf.text(`Exam ID: ${testData.examId} | Time Limit: ${testData.timeLimit} minutes`, margin, yPosition);
    
    if (testData.description) {
      yPosition += 8;
      pdf.text(`Instructions: ${testData.description}`, margin, yPosition);
    }
    
    yPosition += 15;
    
    // Divider line
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    
    yPosition += 15;
    
    // Questions
    testData.questions.forEach((question, index) => {
      // Check if we need a new page
      const estimatedHeight = question.type === 'multiple-choice' ? 60 : 
                             question.type === 'essay' ? 80 : 40;
      if (yPosition + estimatedHeight > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Question number and text
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${index + 1}.`, margin, yPosition);
      
      pdf.setFont(undefined, 'normal');
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
      pdf.text(questionLines, margin + 15, yPosition);
      yPosition += questionLines.length * 6 + 8;
      
      // Answer options for multiple choice
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          pdf.setFontSize(10);
          pdf.text(`${optionLetter}) ${option}`, margin + 20, yPosition);
          yPosition += 8;
        });
        yPosition += 5;
      } else if (question.type === 'true-false') {
        pdf.setFontSize(10);
        pdf.text('A) True', margin + 20, yPosition);
        yPosition += 8;
        pdf.text('B) False', margin + 20, yPosition);
        yPosition += 13;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Answer:', margin + 20, yPosition);
        yPosition += 8;
        
        // Answer lines
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 3; i++) {
          pdf.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
          yPosition += 10;
        }
        yPosition += 5;
      } else if (question.type === 'essay') {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Answer:', margin + 20, yPosition);
        yPosition += 8;
        
        // More answer lines for essays
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 8; i++) {
          pdf.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
          yPosition += 10;
        }
        yPosition += 5;
      }
      
      pdf.setTextColor(0, 0, 0); // Reset text color
      
      // Add some space between questions
      yPosition += 10;
    });
  });
  
  // Footer on each page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
  }
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_All_Students.pdf`;
  pdf.save(fileName);
};
