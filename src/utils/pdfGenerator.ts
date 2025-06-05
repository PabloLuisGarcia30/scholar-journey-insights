
import jsPDF from 'jspdf';

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
}

export interface TestData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  questions: Question[];
}

export const generateTestPDF = (testData: TestData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15; // Reduced margin from 20 to 15
  
  let currentPage = 1;
  let yPosition = margin;

  const addHeader = (pageNumber: number) => {
    // Compact header with essential info only
    pdf.setFillColor(30, 58, 138);
    pdf.rect(0, 0, pageWidth, 20, 'F'); // Reduced height from 30 to 20
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14); // Reduced from 18
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 14);
    
    // EXAM ID in compact format
    pdf.setFontSize(10);
    pdf.text(`ID: ${testData.examId}`, pageWidth - margin - 35, 14);
    
    let headerYPos = 25;
    pdf.setTextColor(0, 0, 0);
    
    // First page only - compact student info
    if (pageNumber === 1) {
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${testData.questions.reduce((sum, q) => sum + q.points, 0)}`, margin, headerYPos);
      
      headerYPos += 8;
      
      // Compact student info section
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 15, 'D');
      
      pdf.setFontSize(8);
      pdf.text('Name:', margin + 5, headerYPos + 8);
      pdf.line(margin + 25, headerYPos + 10, margin + 80, headerYPos + 10);
      
      pdf.text('ID:', margin + 90, headerYPos + 8);
      pdf.line(margin + 105, headerYPos + 10, margin + 140, headerYPos + 10);
      
      pdf.text('Date:', margin + 150, headerYPos + 8);
      pdf.line(margin + 170, headerYPos + 10, pageWidth - margin - 5, headerYPos + 10);
      
      headerYPos += 20;
    } else {
      // Subsequent pages - minimal header
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.title} - Page ${pageNumber}`, margin, headerYPos);
      pdf.text(`ID: ${testData.examId}`, pageWidth - margin - 30, headerYPos);
      headerYPos += 12;
    }
    
    return headerYPos;
  };

  const addFooter = (pageNumber: number, totalPages: number) => {
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageNumber}/${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
    pdf.text(`ID: ${testData.examId}`, margin, pageHeight - 8);
  };

  const calculateQuestionHeight = (question: Question) => {
    let height = 12; // Reduced question header from 18 to 12
    
    // Question text calculation - more compact
    pdf.setFontSize(9); // Reduced from 10
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    height += questionLines.length * 4 + 5; // Reduced line spacing
    
    // Answer options calculation - more compact
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach(option => {
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 60);
        height += Math.max(optionLines.length * 4, 10) + 1; // Reduced spacing
      });
      height += 8; // Reduced spacing for answer box
    } else if (question.type === 'true-false') {
      height += 18; // Reduced from 35
    } else if (question.type === 'short-answer') {
      height += 15; // Reduced from 25
    } else if (question.type === 'essay') {
      height += 20; // Reduced from 35
    }
    
    height += 6; // Reduced bottom margin from 12 to 6
    return height;
  };

  const getMaxContentHeight = (pageNumber: number) => {
    const headerHeight = pageNumber === 1 ? 65 : 40; // Reduced header heights
    const footerHeight = 20;
    return pageHeight - headerHeight - footerHeight;
  };

  // Calculate total pages
  let tempYPosition = 0;
  let tempPageCount = 1;
  let maxContentHeight = getMaxContentHeight(tempPageCount);
  
  testData.questions.forEach((question) => {
    const questionHeight = calculateQuestionHeight(question);
    
    if (tempYPosition + questionHeight > maxContentHeight) {
      tempPageCount++;
      tempYPosition = 0;
      maxContentHeight = getMaxContentHeight(tempPageCount);
    }
    
    tempYPosition += questionHeight;
  });

  const totalPages = tempPageCount;

  // Generate PDF with compact layout
  yPosition = addHeader(currentPage);
  let maxContentHeightForCurrentPage = getMaxContentHeight(currentPage);

  testData.questions.forEach((question, questionIndex) => {
    const questionHeight = calculateQuestionHeight(question);
    
    // Page break if needed
    if (yPosition + questionHeight > maxContentHeightForCurrentPage) {
      addFooter(currentPage, totalPages);
      pdf.addPage();
      currentPage++;
      yPosition = addHeader(currentPage);
      maxContentHeightForCurrentPage = getMaxContentHeight(currentPage);
    }
    
    // Compact question header
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'FD'); // Reduced height from 15 to 10
    
    // Question number and info in one line
    pdf.setFontSize(10); // Reduced from 12
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 58, 138);
    pdf.text(`${questionIndex + 1}.`, margin + 5, yPosition + 7);
    
    pdf.setFontSize(7); // Reduced type indicator
    pdf.setTextColor(107, 114, 128);
    const typeText = question.type.replace('-', ' ').toUpperCase();
    pdf.text(`[${typeText}]`, margin + 20, yPosition + 7);
    
    pdf.setTextColor(220, 38, 127);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${question.points}pt`, pageWidth - margin - 15, yPosition + 7);
    
    yPosition += 12; // Reduced from 18
    
    // Compact question text
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9); // Reduced from 10
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    pdf.text(questionLines, margin + 5, yPosition);
    yPosition += questionLines.length * 4 + 5; // Reduced line spacing
    
    // Compact answer options
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Small option circle
        pdf.setFillColor(59, 130, 246);
        pdf.circle(margin + 10, yPosition + 3, 2.5, 'F'); // Smaller circle
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'bold');
        pdf.text(optionLetter, margin + 8.5, yPosition + 4.5);
        
        // Compact option text
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8); // Reduced from 9
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 60);
        pdf.text(optionLines, margin + 18, yPosition + 2);
        
        yPosition += Math.max(optionLines.length * 4, 8) + 1; // Reduced spacing
      });
      
      // Compact answer box
      yPosition += 2;
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(220, 38, 127);
      pdf.text('Answer:', margin + 5, yPosition + 4);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(1);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin + 30, yPosition, 12, 8, 'FD'); // Smaller answer box
      
      yPosition += 10;
    } else if (question.type === 'true-false') {
      // Compact True/False
      const options = ['True', 'False'];
      options.forEach((option, idx) => {
        const letter = String.fromCharCode(65 + idx);
        
        pdf.setFillColor(idx === 0 ? 34 : 239, idx === 0 ? 197 : 68, idx === 0 ? 94 : 68);
        pdf.circle(margin + 10, yPosition + 3, 2.5, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'bold');
        pdf.text(letter, margin + 8.5, yPosition + 4.5);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        pdf.text(option, margin + 18, yPosition + 4);
        
        yPosition += 8; // Reduced spacing
      });
      
      // Compact answer box
      yPosition += 2;
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(220, 38, 127);
      pdf.text('Answer:', margin + 5, yPosition + 4);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(1);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin + 30, yPosition, 12, 8, 'FD');
      
      yPosition += 10;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Answer:', margin + 5, yPosition + 2);
      yPosition += 6;
      
      // Single answer line to save space
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
      yPosition += 10;
    } else if (question.type === 'essay') {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Answer:', margin + 5, yPosition + 2);
      yPosition += 6;
      
      // Two lines for essays (reduced from 4)
      for (let i = 0; i < 2; i++) {
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
        yPosition += 5; // Reduced line spacing
      }
      yPosition += 5;
    }
    
    // Minimal question separator
    if (questionIndex < testData.questions.length - 1) {
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 5, yPosition + 2, pageWidth - margin - 5, yPosition + 2);
      yPosition += 6; // Reduced from 12
    }
  });
  
  // Add footer to last page
  addFooter(currentPage, totalPages);
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
