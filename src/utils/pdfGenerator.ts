
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
  studentId?: string;
}

export const generateTestPDF = (testData: TestData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  
  // Calculate total points
  const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);
  
  // Color palette matching HTML exactly
  const colors = {
    headerBlue: [30, 58, 138],      // #1e3a8a
    lightGray: [248, 250, 252],     // #f8fafc
    borderGray: [203, 213, 225],    // #cbd5e1
    mediumGray: [148, 163, 184],    // #94a3b8
    textGray: [107, 114, 128],      // #6b7280
    redPoints: [220, 38, 38],       // #dc2626
    darkGray: [100, 100, 100],      // #646464
    lineGray: [150, 150, 150]       // #969696
  };
  
  // Function to add header to any page
  const addPageHeader = (isFirstPage = false) => {
    // Header background - exact match to HTML
    pdf.setFillColor(...colors.headerBlue);
    pdf.rect(margin, margin - 5, pageWidth - 2 * margin, 28, 'F');
    
    // Header content with exact spacing and typography
    pdf.setTextColor(255, 255, 255);
    
    if (testData.studentName && testData.studentId) {
      // Student name and ID on left (14pt)
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.studentName}`, margin + 8, margin + 6);
      pdf.setFontSize(12);
      pdf.text(`ID: ${testData.studentId}`, margin + 8, margin + 16);
      
      // Title in center (16pt)
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      const titleWidth = pdf.getTextWidth(testData.title);
      pdf.text(testData.title, (pageWidth - titleWidth) / 2, margin + 10);
      
      // Exam ID on right (12pt)
      pdf.setFontSize(12);
      const examIdText = `Exam: ${testData.examId}`;
      pdf.text(examIdText, pageWidth - margin - pdf.getTextWidth(examIdText) - 8, margin + 10);
    } else if (testData.studentName) {
      // Student name on left (14pt)
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.studentName}`, margin + 8, margin + 10);
      
      // Title in center (16pt)
      pdf.setFontSize(16);
      const titleWidth = pdf.getTextWidth(testData.title);
      pdf.text(testData.title, (pageWidth - titleWidth) / 2, margin + 10);
      
      // Exam ID on right (12pt)
      pdf.setFontSize(12);
      const examIdText = `Exam: ${testData.examId}`;
      pdf.text(examIdText, pageWidth - margin - pdf.getTextWidth(examIdText) - 8, margin + 10);
    } else {
      // Title centered (16pt)
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      const titleWidth = pdf.getTextWidth(testData.title);
      pdf.text(testData.title, (pageWidth - titleWidth) / 2, margin + 10);
      
      // Exam ID on the right (12pt)
      pdf.setFontSize(12);
      const examIdText = `Exam: ${testData.examId}`;
      pdf.text(examIdText, pageWidth - margin - pdf.getTextWidth(examIdText) - 8, margin + 10);
    }
    
    return margin + 35; // Return new Y position after header
  };
  
  // Add header to first page
  yPosition = addPageHeader(true);
  
  // Class info line - matching HTML exactly (9pt)
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}`, margin, yPosition);
  
  yPosition += 12;
  
  // Student info section with light background (only if no studentName provided)
  if (!testData.studentName) {
    // Light gray background matching HTML
    pdf.setFillColor(...colors.lightGray);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 28, 'F');
    
    // Border matching HTML
    pdf.setDrawColor(...colors.mediumGray);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 28, 'S');
    
    // Content with exact spacing (9pt)
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.text('Name:', margin + 6, yPosition + 10);
    
    // Underlined field
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(margin + 25, yPosition + 12, margin + 120, yPosition + 12);
    
    pdf.text('Student ID:', margin + 6, yPosition + 22);
    pdf.line(margin + 40, yPosition + 24, margin + 120, yPosition + 24);
    
    pdf.text('Date:', margin + 140, yPosition + 10);
    pdf.line(margin + 160, yPosition + 12, pageWidth - margin - 6, yPosition + 12);
    
    yPosition += 35;
  }
  
  // Questions with exact HTML styling
  testData.questions.forEach((question, index) => {
    // Check if we need a new page
    const estimatedHeight = question.type === 'multiple-choice' ? 130 : 
                           question.type === 'true-false' ? 110 :
                           question.type === 'essay' ? 150 : 100;
    if (yPosition + estimatedHeight > pageHeight - 50) {
      pdf.addPage();
      yPosition = addPageHeader(false);
    }
    
    // Question header with light gray background - exact HTML match
    pdf.setFillColor(...colors.lightGray);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'F');
    
    // Question header border
    pdf.setDrawColor(...colors.borderGray);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'S');
    
    // Question number (10pt, blue)
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(...colors.headerBlue);
    pdf.text(`${index + 1}.`, margin + 4, yPosition + 12);
    
    // Question type in center (8pt, gray)
    const typeText = `[${question.type.replace('-', ' ').toUpperCase()}]`;
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(...colors.textGray);
    const typeWidth = pdf.getTextWidth(typeText);
    pdf.text(typeText, (pageWidth - typeWidth) / 2, yPosition + 12);
    
    // Points on the right (8pt, red, bold)
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.redPoints);
    pdf.setFont(undefined, 'bold');
    const pointsText = `${question.points}pt`;
    pdf.text(pointsText, pageWidth - margin - pdf.getTextWidth(pointsText) - 4, yPosition + 12);
    
    yPosition += 22;
    
    // Question content area with padding (3pt)
    const contentStartY = yPosition + 3;
    
    // Question text (10pt, weight 500)
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    pdf.text(questionLines, margin + 5, contentStartY);
    yPosition = contentStartY + questionLines.length * 6 + 6;
    
    // Answer sections with exact HTML styling
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Circle with proper styling
        const circleX = margin + 15;
        const circleY = yPosition - 1;
        const circleRadius = 4;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.setFillColor(255, 255, 255);
        pdf.circle(circleX, circleY, circleRadius, 'FD');
        
        // Option letter (bold)
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${optionLetter}.`, circleX + 8, yPosition + 1);
        
        // Option text (9pt)
        pdf.setFont(undefined, 'normal');
        const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 50);
        pdf.text(optionLines, circleX + 18, yPosition + 1);
        yPosition += Math.max(12, optionLines.length * 6 + 3);
      });
      
      // Answer section with red label
      yPosition += 6;
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.redPoints);
      pdf.setFont(undefined, 'bold');
      pdf.text('Answer:', margin + 15, yPosition);
      
      // Answer box (exact dimensions)
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin + 45, yPosition - 6, 30, 12, 'FD');
      
      yPosition += 15;
    } else if (question.type === 'true-false') {
      // True option
      const circleX = margin + 15;
      let circleY = yPosition - 1;
      const circleRadius = 4;
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.setFillColor(255, 255, 255);
      pdf.circle(circleX, circleY, circleRadius, 'FD');
      
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('A.', circleX + 8, yPosition + 1);
      pdf.setFont(undefined, 'normal');
      pdf.text('True', circleX + 18, yPosition + 1);
      yPosition += 12;
      
      // False option
      circleY = yPosition - 1;
      pdf.circle(circleX, circleY, circleRadius, 'FD');
      pdf.setFont(undefined, 'bold');
      pdf.text('B.', circleX + 8, yPosition + 1);
      pdf.setFont(undefined, 'normal');
      pdf.text('False', circleX + 18, yPosition + 1);
      yPosition += 12;
      
      // Answer section
      yPosition += 6;
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.redPoints);
      pdf.setFont(undefined, 'bold');
      pdf.text('Answer:', margin + 15, yPosition);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin + 45, yPosition - 6, 30, 12, 'FD');
      
      yPosition += 15;
    } else if (question.type === 'short-answer') {
      // Answer label (8pt, gray)
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.textGray);
      pdf.text('Answer:', margin + 10, yPosition);
      yPosition += 8;
      
      // Answer lines with exact styling
      pdf.setDrawColor(...colors.lineGray);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
      yPosition += 14;
      pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
      yPosition += 8;
    } else if (question.type === 'essay') {
      // Answer label (8pt, gray)
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.textGray);
      pdf.text('Answer:', margin + 10, yPosition);
      yPosition += 8;
      
      // Multiple answer lines with exact spacing
      pdf.setDrawColor(...colors.lineGray);
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 3; i++) {
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 14;
      }
      yPosition += 8;
    }
    
    // Reset text color for next question
    pdf.setTextColor(0, 0, 0);
    yPosition += 15;
  });
  
  // Footer on each page with exact HTML styling
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.textGray);
    
    // Page number
    pdf.text(`${i}/${pageCount}`, pageWidth - margin - 15, pageHeight - 15);
    
    // Student info in footer
    if (testData.studentName && testData.studentId) {
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.studentName} (ID: ${testData.studentId})`, margin, pageHeight - 15);
    } else if (testData.studentName) {
      pdf.setFont(undefined, 'bold');
      pdf.text(`Student: ${testData.studentName}`, margin, pageHeight - 15);
    }
    
    // Exam info centered
    pdf.setFont(undefined, 'normal');
    const examFooterText = `${testData.title} - ${testData.examId}`;
    const footerWidth = pdf.getTextWidth(examFooterText);
    pdf.text(examFooterText, (pageWidth - footerWidth) / 2, pageHeight - 15);
  }
  
  const fileName = testData.studentName && testData.studentId
    ? `${testData.title.replace(/\s+/g, '_')}_${testData.studentName.replace(/\s+/g, '_')}_${testData.studentId}.pdf`
    : testData.studentName 
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
  
  // Color palette matching HTML exactly
  const colors = {
    headerBlue: [30, 58, 138],      // #1e3a8a
    lightGray: [248, 250, 252],     // #f8fafc
    borderGray: [203, 213, 225],    // #cbd5e1
    mediumGray: [148, 163, 184],    // #94a3b8
    textGray: [107, 114, 128],      // #6b7280
    redPoints: [220, 38, 38],       // #dc2626
    darkGray: [100, 100, 100],      // #646464
    lineGray: [150, 150, 150]       // #969696
  };
  
  // Function to add header with student name
  const addPageHeader = (studentName: string) => {
    // Header background - exact match to HTML
    pdf.setFillColor(...colors.headerBlue);
    pdf.rect(margin, margin - 5, pageWidth - 2 * margin, 28, 'F');
    
    // Student name on left (14pt)
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${studentName}`, margin + 8, margin + 10);
    
    // Title in center (16pt)
    pdf.setFontSize(16);
    const titleWidth = pdf.getTextWidth(testData.title);
    pdf.text(testData.title, (pageWidth - titleWidth) / 2, margin + 10);
    
    // Exam ID on right (12pt)
    pdf.setFontSize(12);
    const examIdText = `Exam: ${testData.examId}`;
    pdf.text(examIdText, pageWidth - margin - pdf.getTextWidth(examIdText) - 8, margin + 10);
    
    return margin + 35;
  };
  
  studentNames.forEach((studentName, studentIndex) => {
    if (studentIndex > 0) {
      pdf.addPage();
    }
    
    let yPosition = addPageHeader(studentName);
    
    // Class info line - matching HTML exactly (9pt)
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}`, margin, yPosition);
    
    yPosition += 15;
    
    // Questions with exact HTML styling (same as individual PDF)
    testData.questions.forEach((question, index) => {
      const estimatedHeight = question.type === 'multiple-choice' ? 130 : 
                             question.type === 'true-false' ? 110 :
                             question.type === 'essay' ? 150 : 100;
      if (yPosition + estimatedHeight > pageHeight - 50) {
        pdf.addPage();
        yPosition = addPageHeader(studentName);
      }
      
      // Question header with light gray background
      pdf.setFillColor(...colors.lightGray);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'F');
      
      pdf.setDrawColor(...colors.borderGray);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'S');
      
      // Question number (10pt, blue)
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(...colors.headerBlue);
      pdf.text(`${index + 1}.`, margin + 4, yPosition + 12);
      
      // Question type in center (8pt, gray)
      const typeText = `[${question.type.replace('-', ' ').toUpperCase()}]`;
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(...colors.textGray);
      const typeWidth = pdf.getTextWidth(typeText);
      pdf.text(typeText, (pageWidth - typeWidth) / 2, yPosition + 12);
      
      // Points on the right (8pt, red, bold)
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.redPoints);
      pdf.setFont(undefined, 'bold');
      const pointsText = `${question.points}pt`;
      pdf.text(pointsText, pageWidth - margin - pdf.getTextWidth(pointsText) - 4, yPosition + 12);
      
      yPosition += 22;
      
      // Question text (10pt)
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
      pdf.text(questionLines, margin + 5, yPosition + 3);
      yPosition += questionLines.length * 6 + 9;
      
      // Handle answer sections (same logic as individual PDF)
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          const circleX = margin + 15;
          const circleY = yPosition - 1;
          const circleRadius = 4;
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.8);
          pdf.setFillColor(255, 255, 255);
          pdf.circle(circleX, circleY, circleRadius, 'FD');
          
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${optionLetter}.`, circleX + 8, yPosition + 1);
          
          pdf.setFont(undefined, 'normal');
          const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 50);
          pdf.text(optionLines, circleX + 18, yPosition + 1);
          yPosition += Math.max(12, optionLines.length * 6 + 3);
        });
        
        yPosition += 6;
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.redPoints);
        pdf.setFont(undefined, 'bold');
        pdf.text('Answer:', margin + 15, yPosition);
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(margin + 45, yPosition - 6, 30, 12, 'FD');
        yPosition += 15;
      } else if (question.type === 'true-false') {
        const circleX = margin + 15;
        let circleY = yPosition - 1;
        const circleRadius = 4;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.setFillColor(255, 255, 255);
        pdf.circle(circleX, circleY, circleRadius, 'FD');
        
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('A.', circleX + 8, yPosition + 1);
        pdf.setFont(undefined, 'normal');
        pdf.text('True', circleX + 18, yPosition + 1);
        yPosition += 12;
        
        circleY = yPosition - 1;
        pdf.circle(circleX, circleY, circleRadius, 'FD');
        pdf.setFont(undefined, 'bold');
        pdf.text('B.', circleX + 8, yPosition + 1);
        pdf.setFont(undefined, 'normal');
        pdf.text('False', circleX + 18, yPosition + 1);
        yPosition += 12;
        
        yPosition += 6;
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.redPoints);
        pdf.setFont(undefined, 'bold');
        pdf.text('Answer:', margin + 15, yPosition);
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.8);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(margin + 45, yPosition - 6, 30, 12, 'FD');
        yPosition += 15;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.textGray);
        pdf.text('Answer:', margin + 10, yPosition);
        yPosition += 8;
        
        pdf.setDrawColor(...colors.lineGray);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 14;
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 8;
      } else if (question.type === 'essay') {
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.textGray);
        pdf.text('Answer:', margin + 10, yPosition);
        yPosition += 8;
        
        pdf.setDrawColor(...colors.lineGray);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 3; i++) {
          pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
          yPosition += 14;
        }
        yPosition += 8;
      }
      
      pdf.setTextColor(0, 0, 0);
      yPosition += 15;
    });
  });
  
  // Footer on each page with exact HTML styling
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.textGray);
    pdf.text(`${i}/${pageCount}`, pageWidth - margin - 15, pageHeight - 15);
    
    const examFooterText = `${testData.title} - ${testData.examId}`;
    const footerWidth = pdf.getTextWidth(examFooterText);
    pdf.text(examFooterText, (pageWidth - footerWidth) / 2, pageHeight - 15);
  }
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_All_Students.pdf`;
  pdf.save(fileName);
};
