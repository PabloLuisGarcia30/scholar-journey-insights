
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
  
  // Calculate total points
  const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);
  
  // Header section with blue background (simulate)
  pdf.setFillColor(30, 58, 138); // Blue background color
  pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 25, 'F');
  
  // Title in white text
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(255, 255, 255); // White text
  pdf.text(testData.title, margin, yPosition + 8);
  
  // Exam ID on the right
  pdf.setFontSize(10);
  pdf.text(`ID: ${testData.examId}`, pageWidth - margin - 30, yPosition + 8);
  
  yPosition += 25;
  
  // Reset text color to black
  pdf.setTextColor(0, 0, 0);
  
  // Class info line
  pdf.setFontSize(9);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}`, margin, yPosition);
  
  yPosition += 10;
  
  // Student info section with light gray background
  pdf.setFillColor(248, 250, 252); // Light gray background
  pdf.setDrawColor(148, 163, 184); // Border color
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'FD');
  
  pdf.setFontSize(9);
  if (testData.studentName) {
    pdf.setFont(undefined, 'bold');
    pdf.text(`Name: ${testData.studentName}`, margin + 5, yPosition + 8);
  } else {
    pdf.text('Name: ____________________', margin + 5, yPosition + 8);
  }
  
  pdf.setFont(undefined, 'normal');
  pdf.text('ID: ____________________', margin + 100, yPosition + 8);
  pdf.text('Date: ____________________', margin + 180, yPosition + 8);
  
  yPosition += 25;
  
  // Questions
  testData.questions.forEach((question, index) => {
    // Check if we need a new page
    const estimatedHeight = question.type === 'multiple-choice' ? 100 : 
                           question.type === 'true-false' ? 80 :
                           question.type === 'essay' ? 120 : 70;
    if (yPosition + estimatedHeight > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Question header with light background
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.setDrawColor(203, 213, 225); // Border color
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'FD');
    
    // Question number
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 58, 138); // Blue color
    pdf.text(`${index + 1}.`, margin + 3, yPosition + 8);
    
    // Question type
    const typeText = question.type.replace('-', ' ').toUpperCase();
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128); // Gray color
    pdf.text(`[${typeText}]`, margin + 80, yPosition + 8);
    
    // Points
    pdf.setFontSize(8);
    pdf.setTextColor(220, 38, 38); // Red color
    pdf.setFont(undefined, 'bold');
    pdf.text(`${question.points}pt`, pageWidth - margin - 20, yPosition + 8);
    
    yPosition += 15;
    
    // Question text
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    pdf.text(questionLines, margin + 5, yPosition);
    yPosition += questionLines.length * 6 + 8;
    
    // Answer options
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Draw empty circle
        const circleX = margin + 15;
        const circleY = yPosition - 2;
        const circleRadius = 3;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.circle(circleX, circleY, circleRadius, 'S');
        
        // Option letter
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
        
        // Option text
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 40);
        pdf.text(optionLines, circleX + 18, yPosition);
        yPosition += Math.max(8, optionLines.length * 6);
      });
      
      // Answer box
      yPosition += 5;
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38); // Red color
      pdf.setFont(undefined, 'bold');
      pdf.text('Answer:', margin + 15, yPosition);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin + 40, yPosition - 6, 15, 8, 'S');
      
      yPosition += 10;
    } else if (question.type === 'true-false') {
      // True option
      const circleX = margin + 15;
      let circleY = yPosition - 2;
      const circleRadius = 3;
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.circle(circleX, circleY, circleRadius, 'S');
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('A.', circleX + 8, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      pdf.text('True', circleX + 18, yPosition);
      yPosition += 10;
      
      // False option
      circleY = yPosition - 2;
      pdf.circle(circleX, circleY, circleRadius, 'S');
      pdf.setFont(undefined, 'bold');
      pdf.text('B.', circleX + 8, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.text('False', circleX + 18, yPosition);
      yPosition += 8;
      
      // Answer box
      yPosition += 5;
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38); // Red color
      pdf.setFont(undefined, 'bold');
      pdf.text('Answer:', margin + 15, yPosition);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin + 40, yPosition - 6, 15, 8, 'S');
      
      yPosition += 10;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // Gray color
      pdf.text('Answer:', margin + 10, yPosition);
      yPosition += 8;
      
      // Answer line
      pdf.setDrawColor(203, 213, 225); // Light gray
      pdf.setLineWidth(0.3);
      pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
      yPosition += 15;
    } else if (question.type === 'essay') {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // Gray color
      pdf.text('Answer:', margin + 10, yPosition);
      yPosition += 8;
      
      // Multiple answer lines
      pdf.setDrawColor(203, 213, 225); // Light gray
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 3; i++) {
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 12;
      }
      yPosition += 5;
    }
    
    pdf.setTextColor(0, 0, 0); // Reset text color
    yPosition += 10; // Space between questions
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
  
  // Calculate total points
  const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);
  
  studentNames.forEach((studentName, studentIndex) => {
    if (studentIndex > 0) {
      pdf.addPage();
    }
    
    let yPosition = margin;
    
    // Header section with blue background (simulate)
    pdf.setFillColor(30, 58, 138); // Blue background color
    pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 25, 'F');
    
    // Title in white text
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255); // White text
    pdf.text(testData.title, margin, yPosition + 8);
    
    // Exam ID on the right
    pdf.setFontSize(10);
    pdf.text(`ID: ${testData.examId}`, pageWidth - margin - 30, yPosition + 8);
    
    yPosition += 25;
    
    // Reset text color to black
    pdf.setTextColor(0, 0, 0);
    
    // Class info line
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}`, margin, yPosition);
    
    yPosition += 10;
    
    // Student info section with light gray background
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.setDrawColor(148, 163, 184); // Border color
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Name: ${studentName}`, margin + 5, yPosition + 8);
    
    pdf.setFont(undefined, 'normal');
    pdf.text('ID: ____________________', margin + 100, yPosition + 8);
    pdf.text('Date: ____________________', margin + 180, yPosition + 8);
    
    yPosition += 25;
    
    // Questions
    testData.questions.forEach((question, index) => {
      // Check if we need a new page
      const estimatedHeight = question.type === 'multiple-choice' ? 100 : 
                             question.type === 'true-false' ? 80 :
                             question.type === 'essay' ? 120 : 70;
      if (yPosition + estimatedHeight > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Question header with light background
      pdf.setFillColor(248, 250, 252); // Light gray background
      pdf.setDrawColor(203, 213, 225); // Border color
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'FD');
      
      // Question number
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(30, 58, 138); // Blue color
      pdf.text(`${index + 1}.`, margin + 3, yPosition + 8);
      
      // Question type
      const typeText = question.type.replace('-', ' ').toUpperCase();
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // Gray color
      pdf.text(`[${typeText}]`, margin + 80, yPosition + 8);
      
      // Points
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38); // Red color
      pdf.setFont(undefined, 'bold');
      pdf.text(`${question.points}pt`, pageWidth - margin - 20, yPosition + 8);
      
      yPosition += 15;
      
      // Question text
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
      pdf.text(questionLines, margin + 5, yPosition);
      yPosition += questionLines.length * 6 + 8;
      
      // Answer options
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          
          // Draw empty circle
          const circleX = margin + 15;
          const circleY = yPosition - 2;
          const circleRadius = 3;
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.circle(circleX, circleY, circleRadius, 'S');
          
          // Option letter
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
          
          // Option text
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(9);
          const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 40);
          pdf.text(optionLines, circleX + 18, yPosition);
          yPosition += Math.max(8, optionLines.length * 6);
        });
        
        // Answer box
        yPosition += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(220, 38, 38); // Red color
        pdf.setFont(undefined, 'bold');
        pdf.text('Answer:', margin + 15, yPosition);
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin + 40, yPosition - 6, 15, 8, 'S');
        
        yPosition += 10;
      } else if (question.type === 'true-false') {
        // True option
        const circleX = margin + 15;
        let circleY = yPosition - 2;
        const circleRadius = 3;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.circle(circleX, circleY, circleRadius, 'S');
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('A.', circleX + 8, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.text('True', circleX + 18, yPosition);
        yPosition += 10;
        
        // False option
        circleY = yPosition - 2;
        pdf.circle(circleX, circleY, circleRadius, 'S');
        pdf.setFont(undefined, 'bold');
        pdf.text('B.', circleX + 8, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text('False', circleX + 18, yPosition);
        yPosition += 8;
        
        // Answer box
        yPosition += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(220, 38, 38); // Red color
        pdf.setFont(undefined, 'bold');
        pdf.text('Answer:', margin + 15, yPosition);
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin + 40, yPosition - 6, 15, 8, 'S');
        
        yPosition += 10;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128); // Gray color
        pdf.text('Answer:', margin + 10, yPosition);
        yPosition += 8;
        
        // Answer line
        pdf.setDrawColor(203, 213, 225); // Light gray
        pdf.setLineWidth(0.3);
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 15;
      } else if (question.type === 'essay') {
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128); // Gray color
        pdf.text('Answer:', margin + 10, yPosition);
        yPosition += 8;
        
        // Multiple answer lines
        pdf.setDrawColor(203, 213, 225); // Light gray
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 3; i++) {
          pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
          yPosition += 12;
        }
        yPosition += 5;
      }
      
      pdf.setTextColor(0, 0, 0); // Reset text color
      yPosition += 10; // Space between questions
    });
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
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_All_Students.pdf`;
  pdf.save(fileName);
};
