import { Question, TestData } from '@/utils/pdfGenerator';

export interface StudentTestData extends TestData {
  studentName: string;
}

export const generateTestHTML = (testData: TestData | StudentTestData): string => {
  const isStudentSpecific = 'studentName' in testData;
  const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${testData.title} - ${testData.examId}</title>
      <style>
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.2;
            color: #000;
            background: white;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .question {
            break-inside: avoid;
            margin-bottom: 12pt;
          }
          
          .question-header {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 4pt;
            margin-bottom: 4pt;
          }
          
          .answer-box {
            border: 1px solid #000;
            width: 30pt;
            height: 12pt;
            display: inline-block;
            margin-left: 8pt;
          }
          
          .answer-lines {
            border-bottom: 1px solid #cbd5e1;
            height: 14pt;
            margin: 2pt 0;
          }
          
          .option-circle {
            width: 12pt;
            height: 12pt;
            border: 1px solid #000;
            border-radius: 50%;
            display: inline-block;
            margin-right: 6pt;
            vertical-align: middle;
            background: white;
          }
          
          .option-letter {
            display: inline-block;
            margin-right: 6pt;
            font-weight: bold;
            font-size: 10pt;
            vertical-align: middle;
          }
          
          .header-section {
            background: #1e3a8a;
            color: white;
            padding: 8pt;
            margin-bottom: 12pt;
          }
          
          .student-info {
            border: 1px solid #94a3b8;
            padding: 6pt;
            margin-bottom: 12pt;
            background: #f8fafc;
          }
          
          .info-line {
            display: inline-block;
            margin-right: 20pt;
            border-bottom: 1px solid #000;
            min-width: 80pt;
          }
        }
        
        @media screen {
          body {
            font-family: Arial, sans-serif;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
          }
          
          .print-preview {
            background: white;
            padding: 0.5in;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
          }
          
          .question {
            margin-bottom: 15px;
          }
          
          .question-header {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 6px;
            margin-bottom: 6px;
          }
          
          .answer-box {
            border: 1px solid #000;
            width: 40px;
            height: 16px;
            display: inline-block;
            margin-left: 10px;
          }
          
          .answer-lines {
            border-bottom: 1px solid #cbd5e1;
            height: 18px;
            margin: 3px 0;
          }
          
          .option-circle {
            width: 16px;
            height: 16px;
            border: 1px solid #000;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
            vertical-align: middle;
            background: white;
          }
          
          .option-letter {
            display: inline-block;
            margin-right: 8px;
            font-weight: bold;
            font-size: 12px;
            vertical-align: middle;
          }
          
          .header-section {
            background: #1e3a8a;
            color: white;
            padding: 12px;
            margin-bottom: 16px;
          }
          
          .student-info {
            border: 1px solid #94a3b8;
            padding: 8px;
            margin-bottom: 16px;
            background: #f8fafc;
          }
          
          .info-line {
            display: inline-block;
            margin-right: 25px;
            border-bottom: 1px solid #000;
            min-width: 100px;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-preview">
        <div class="header-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0; font-size: 14pt;">${testData.title}</h1>
            <span style="font-size: 10pt;">ID: ${testData.examId}</span>
          </div>
        </div>
        
        <div style="font-size: 9pt; margin-bottom: 8pt;">
          Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${totalPoints}
        </div>
        
        <div class="student-info">
          <div style="font-size: 9pt;">
            ${isStudentSpecific 
              ? `<strong>Name: ${testData.studentName}</strong>` 
              : 'Name: <span class="info-line"></span>'
            }
            <span style="margin-left: 20pt;">ID: <span class="info-line"></span></span>
            <span style="margin-left: 20pt;">Date: <span class="info-line"></span></span>
          </div>
        </div>
        
        ${testData.questions.map((question, index) => generateQuestionHTML(question, index)).join('')}
      </div>
    </body>
    </html>
  `;
};

const generateQuestionHTML = (question: Question, index: number): string => {
  const questionNumber = index + 1;
  const typeText = question.type.replace('-', ' ').toUpperCase();
  
  let answerSection = '';
  
  if (question.type === 'multiple-choice' && question.options) {
    const optionsHTML = question.options.map((option, optionIndex) => {
      const optionLetter = String.fromCharCode(65 + optionIndex);
      return `
        <div style="margin: 3pt 0; display: flex; align-items: center;">
          <span class="option-circle"></span>
          <span class="option-letter">${optionLetter}.</span>
          <span style="font-size: 9pt;">${option}</span>
        </div>
      `;
    }).join('');
    
    answerSection = `
      ${optionsHTML}
      <div style="margin-top: 6pt; font-size: 8pt; color: #dc2626; font-weight: bold;">
        Answer: <span class="answer-box"></span>
      </div>
    `;
  } else if (question.type === 'true-false') {
    answerSection = `
      <div style="margin: 3pt 0; display: flex; align-items: center;">
        <span class="option-circle"></span>
        <span class="option-letter">A.</span>
        <span style="font-size: 9pt;">True</span>
      </div>
      <div style="margin: 3pt 0; display: flex; align-items: center;">
        <span class="option-circle"></span>
        <span class="option-letter">B.</span>
        <span style="font-size: 9pt;">False</span>
      </div>
      <div style="margin-top: 6pt; font-size: 8pt; color: #dc2626; font-weight: bold;">
        Answer: <span class="answer-box"></span>
      </div>
    `;
  } else if (question.type === 'short-answer') {
    answerSection = `
      <div style="font-size: 8pt; color: #6b7280; margin-bottom: 3pt;">Answer:</div>
      <div class="answer-lines"></div>
    `;
  } else if (question.type === 'essay') {
    answerSection = `
      <div style="font-size: 8pt; color: #6b7280; margin-bottom: 3pt;">Answer:</div>
      <div class="answer-lines"></div>
      <div class="answer-lines"></div>
      <div class="answer-lines"></div>
    `;
  }
  
  return `
    <div class="question">
      <div class="question-header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #1e3a8a; font-size: 10pt;">${questionNumber}.</span>
          <span style="font-size: 8pt; color: #6b7280;">[${typeText}]</span>
          <span style="font-size: 8pt; color: #dc2626; font-weight: bold;">${question.points}pt</span>
        </div>
      </div>
      <div style="padding: 3pt; margin-bottom: 6pt;">
        <div style="font-size: 10pt; font-weight: 500; margin-bottom: 6pt;">${question.question}</div>
        ${answerSection}
      </div>
    </div>
  `;
};

export const generateConsolidatedTestHTML = (testData: TestData, studentNames: string[]): string => {
  const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);
  
  const studentsHTML = studentNames.map((studentName, studentIndex) => {
    const studentTestData: StudentTestData = {
      ...testData,
      studentName
    };
    
    return `
      ${studentIndex > 0 ? '<div class="page-break"></div>' : ''}
      ${generateTestHTML(studentTestData)}
    `;
  }).join('');
  
  return studentsHTML;
};

export const printTest = (testData: TestData | StudentTestData) => {
  const htmlContent = generateTestHTML(testData);
  printHTML(htmlContent);
};

export const printConsolidatedTests = (testData: TestData, studentNames: string[]) => {
  const htmlContent = generateConsolidatedTestHTML(testData, studentNames);
  printHTML(htmlContent);
};

const printHTML = (htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  } else {
    console.error('Unable to open print window. Please check your browser settings.');
  }
};
