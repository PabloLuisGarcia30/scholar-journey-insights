
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
  
  // Header - Title centered, larger
  pdf.setFontSize(18);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(0, 0, 0);
  const titleWidth = pdf.getTextWidth(testData.title);
  pdf.text(testData.title, (pageWidth - titleWidth) / 2, yPosition + 5);
  
  // Exam ID on the right, smaller and lighter
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(120, 120, 120);
  pdf.text(`ID: ${testData.examId}`, pageWidth - margin - pdf.getTextWidth(`ID: ${testData.examId}`), yPosition + 5);
  
  yPosition += 20;
  
  // Class info line - smaller font
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}`, margin, yPosition);
  
  yPosition += 15;
  
  // Student info section with border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'S');
  
  pdf.setFontSize(11);
  if (testData.studentName) {
    pdf.setFont(undefined, 'bold');
    pdf.text(`Name: ${testData.studentName}`, margin + 5, yPosition + 10);
  } else {
    pdf.text('Name: ____________________', margin + 5, yPosition + 10);
  }
  
  pdf.setFont(undefined, 'normal');
  pdf.text('ID: ____________________', margin + 120, yPosition + 10);
  pdf.text('Date: ____________________', margin + 220, yPosition + 10);
  
  yPosition += 30;
  
  // Questions
  testData.questions.forEach((question, index) => {
    // Check if we need a new page
    const estimatedHeight = question.type === 'multiple-choice' ? 120 : 
                           question.type === 'true-false' ? 100 :
                           question.type === 'essay' ? 140 : 90;
    if (yPosition + estimatedHeight > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Question number and info in a bordered box
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'S');
    
    // Question number
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${index + 1}.`, margin + 5, yPosition + 10);
    
    // Question type in center
    const typeText = `[${question.type.replace('-', ' ').toUpperCase()}]`;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 100, 100);
    const typeWidth = pdf.getTextWidth(typeText);
    pdf.text(typeText, (pageWidth - typeWidth) / 2, yPosition + 10);
    
    // Points on the right
    pdf.setFontSize(11);
    pdf.setTextColor(220, 38, 38);
    pdf.setFont(undefined, 'bold');
    const pointsText = `${question.points}pt`;
    pdf.text(pointsText, pageWidth - margin - pdf.getTextWidth(pointsText) - 5, yPosition + 10);
    
    yPosition += 20;
    
    // Question text
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    pdf.text(questionLines, margin + 5, yPosition);
    yPosition += questionLines.length * 6 + 10;
    
    // Answer options
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Draw empty circle
        const circleX = margin + 15;
        const circleY = yPosition - 2;
        const circleRadius = 3;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.circle(circleX, circleY, circleRadius, 'S');
        
        // Option letter and text
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
        
        pdf.setFont(undefined, 'normal');
        const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 40);
        pdf.text(optionLines, circleX + 18, yPosition);
        yPosition += Math.max(10, optionLines.length * 6);
      });
      
      // Answer box
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(220, 38, 38);
      pdf.setFont(undefined, 'bold');
      pdf.text('Answer:', margin + 15, yPosition);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.rect(margin + 55, yPosition - 8, 20, 12, 'S');
      
      yPosition += 15;
    } else if (question.type === 'true-false') {
      // True option
      const circleX = margin + 15;
      let circleY = yPosition - 2;
      const circleRadius = 3;
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.circle(circleX, circleY, circleRadius, 'S');
      
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('A.', circleX + 8, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.text('True', circleX + 18, yPosition);
      yPosition += 12;
      
      // False option
      circleY = yPosition - 2;
      pdf.circle(circleX, circleY, circleRadius, 'S');
      pdf.setFont(undefined, 'bold');
      pdf.text('B.', circleX + 8, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.text('False', circleX + 18, yPosition);
      yPosition += 12;
      
      // Answer box
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(220, 38, 38);
      pdf.setFont(undefined, 'bold');
      pdf.text('Answer:', margin + 15, yPosition);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.rect(margin + 55, yPosition - 8, 20, 12, 'S');
      
      yPosition += 15;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Answer:', margin + 10, yPosition);
      yPosition += 10;
      
      // Answer lines
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 2; i++) {
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 15;
      }
      yPosition += 5;
    } else if (question.type === 'essay') {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Answer:', margin + 10, yPosition);
      yPosition += 10;
      
      // Multiple answer lines
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 4; i++) {
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 15;
      }
      yPosition += 5;
    }
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 15;
  });
  
  // Footer on each page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`${i}/${pageCount}`, pageWidth - margin - 15, pageHeight - 15);
    pdf.text('about:blank', margin, pageHeight - 15);
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
    
    // Header - Title centered, larger
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    const titleWidth = pdf.getTextWidth(testData.title);
    pdf.text(testData.title, (pageWidth - titleWidth) / 2, yPosition + 5);
    
    // Exam ID on the right, smaller and lighter
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text(`ID: ${testData.examId}`, pageWidth - margin - pdf.getTextWidth(`ID: ${testData.examId}`), yPosition + 5);
    
    yPosition += 20;
    
    // Class info line - smaller font
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}`, margin, yPosition);
    
    yPosition += 15;
    
    // Student info section with border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'S');
    
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Name: ${studentName}`, margin + 5, yPosition + 10);
    
    pdf.setFont(undefined, 'normal');
    pdf.text('ID: ____________________', margin + 120, yPosition + 10);
    pdf.text('Date: ____________________', margin + 220, yPosition + 10);
    
    yPosition += 30;
    
    // Questions (same as individual PDF)
    testData.questions.forEach((question, index) => {
      // Check if we need a new page
      const estimatedHeight = question.type === 'multiple-choice' ? 120 : 
                             question.type === 'true-false' ? 100 :
                             question.type === 'essay' ? 140 : 90;
      if (yPosition + estimatedHeight > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Question number and info in a bordered box
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'S');
      
      // Question number
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${index + 1}.`, margin + 5, yPosition + 10);
      
      // Question type in center
      const typeText = `[${question.type.replace('-', ' ').toUpperCase()}]`;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      const typeWidth = pdf.getTextWidth(typeText);
      pdf.text(typeText, (pageWidth - typeWidth) / 2, yPosition + 10);
      
      // Points on the right
      pdf.setFontSize(11);
      pdf.setTextColor(220, 38, 38);
      pdf.setFont(undefined, 'bold');
      const pointsText = `${question.points}pt`;
      pdf.text(pointsText, pageWidth - margin - pdf.getTextWidth(pointsText) - 5, yPosition + 10);
      
      yPosition += 20;
      
      // Question text
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
      pdf.text(questionLines, margin + 5, yPosition);
      yPosition += questionLines.length * 6 + 10;
      
      // Answer options
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          
          // Draw empty circle
          const circleX = margin + 15;
          const circleY = yPosition - 2;
          const circleRadius = 3;
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.8);
          pdf.circle(circleX, circleY, circleRadius, 'S');
          
          // Option letter and text
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
          
          pdf.setFont(undefined, 'normal');
          const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 40);
          pdf.text(optionLines, circleX + 18, yPosition);
          yPosition += Math.max(10, optionLines.length * 6);
        });
        
        // Answer box
        yPosition += 8;
        pdf.setFontSize(11);
        pdf.setTextColor(220, 38, 38);
        pdf.setFont(undefined, 'bold');
        pdf.text('Answer:', margin + 15, yPosition);
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.rect(margin + 55, yPosition - 8, 20, 12, 'S');
        
        yPosition += 15;
      } else if (question.type === 'true-false') {
        // True option
        const circleX = margin + 15;
        let circleY = yPosition - 2;
        const circleRadius = 3;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.circle(circleX, circleY, circleRadius, 'S');
        
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('A.', circleX + 8, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text('True', circleX + 18, yPosition);
        yPosition += 12;
        
        // False option
        circleY = yPosition - 2;
        pdf.circle(circleX, circleY, circleRadius, 'S');
        pdf.setFont(undefined, 'bold');
        pdf.text('B.', circleX + 8, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text('False', circleX + 18, yPosition);
        yPosition += 12;
        
        // Answer box
        yPosition += 8;
        pdf.setFontSize(11);
        pdf.setTextColor(220, 38, 38);
        pdf.setFont(undefined, 'bold');
        pdf.text('Answer:', margin + 15, yPosition);
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.rect(margin + 55, yPosition - 8, 20, 12, 'S');
        
        yPosition += 15;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Answer:', margin + 10, yPosition);
        yPosition += 10;
        
        // Answer lines
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 2; i++) {
          pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
          yPosition += 15;
        }
        yPosition += 5;
      } else if (question.type === 'essay') {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Answer:', margin + 10, yPosition);
        yPosition += 10;
        
        // Multiple answer lines
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 4; i++) {
          pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
          yPosition += 15;
        }
        yPosition += 5;
      }
      
      pdf.setTextColor(0, 0, 0);
      yPosition += 15;
    });
  });
  
  // Footer on each page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`${i}/${pageCount}`, pageWidth - margin - 15, pageHeight - 15);
    pdf.text('about:blank', margin, pageHeight - 15);
  }
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_All_Students.pdf`;
  pdf.save(fileName);
};
