
export interface StudentNameDetectionResult {
  detectedName: string | null;
  confidence: number;
  detectionMethod: 'header' | 'form_field' | 'ocr_scan' | 'none';
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class StudentNameDetectionService {
  private static readonly NAME_PATTERNS = [
    // Common name field patterns
    /(?:name|student|student\s*name|name\s*:)\s*([A-Za-z\s\-\'\.]+)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s|$)/m,
    // Header patterns (for generated tests)
    /(?:^|\s)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:ID:|Exam|Test)/i,
    // Form field patterns
    /Student:\s*([A-Za-z\s\-\'\.]+)/i,
    /Name:\s*([A-Za-z\s\-\'\.]+)/i
  ];

  static detectStudentName(extractedText: string, fileName?: string): StudentNameDetectionResult {
    console.log('🔍 StudentNameDetectionService: Detecting student name from text');
    
    // Try header detection first (most reliable for generated tests)
    const headerResult = this.detectFromHeader(extractedText);
    if (headerResult.detectedName) {
      console.log(`✅ Found student name in header: ${headerResult.detectedName}`);
      return headerResult;
    }

    // Try form field detection
    const formResult = this.detectFromFormFields(extractedText);
    if (formResult.detectedName) {
      console.log(`✅ Found student name in form field: ${formResult.detectedName}`);
      return formResult;
    }

    // Try general OCR scan
    const ocrResult = this.detectFromOCRScan(extractedText);
    if (ocrResult.detectedName) {
      console.log(`✅ Found student name via OCR scan: ${ocrResult.detectedName}`);
      return ocrResult;
    }

    // Try filename detection as last resort
    if (fileName) {
      const filenameResult = this.detectFromFilename(fileName);
      if (filenameResult.detectedName) {
        console.log(`✅ Found student name in filename: ${filenameResult.detectedName}`);
        return filenameResult;
      }
    }

    console.log('❌ No student name detected');
    return {
      detectedName: null,
      confidence: 0,
      detectionMethod: 'none'
    };
  }

  private static detectFromHeader(text: string): StudentNameDetectionResult {
    // Look for names in the first few lines (header area)
    const headerLines = text.split('\n').slice(0, 5).join('\n');
    
    // Pattern for generated test headers: "StudentName Title ID: ExamID"
    const headerPattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+.*(?:ID:|Exam)/i;
    const match = headerLines.match(headerPattern);
    
    if (match) {
      const name = match[1].trim();
      if (this.isValidName(name)) {
        return {
          detectedName: name,
          confidence: 0.95,
          detectionMethod: 'header'
        };
      }
    }

    return { detectedName: null, confidence: 0, detectionMethod: 'none' };
  }

  private static detectFromFormFields(text: string): StudentNameDetectionResult {
    // Look for specific form field patterns
    const formPatterns = [
      /(?:Student\s*Name|Name)\s*:?\s*([A-Za-z\s\-\'\.]{2,50})/i,
      /Student:\s*([A-Za-z\s\-\'\.]{2,50})/i,
      /Name:\s*([A-Za-z\s\-\'\.]{2,50})/i
    ];

    for (const pattern of formPatterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (this.isValidName(name) && !this.isCommonNonName(name)) {
          return {
            detectedName: name,
            confidence: 0.85,
            detectionMethod: 'form_field'
          };
        }
      }
    }

    return { detectedName: null, confidence: 0, detectionMethod: 'none' };
  }

  private static detectFromOCRScan(text: string): StudentNameDetectionResult {
    // Look for name patterns throughout the text
    for (const pattern of this.NAME_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const potentialName = match[1]?.trim();
        if (potentialName && this.isValidName(potentialName) && !this.isCommonNonName(potentialName)) {
          return {
            detectedName: potentialName,
            confidence: 0.70,
            detectionMethod: 'ocr_scan'
          };
        }
      }
    }

    return { detectedName: null, confidence: 0, detectionMethod: 'none' };
  }

  private static detectFromFilename(filename: string): StudentNameDetectionResult {
    // Remove file extension and common test prefixes
    const cleanName = filename
      .replace(/\.(pdf|jpg|jpeg|png|tiff?)$/i, '')
      .replace(/^(test|exam|quiz|assignment)_?/i, '')
      .replace(/_/g, ' ')
      .trim();

    // Look for name patterns in filename
    const nameMatch = cleanName.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (this.isValidName(name)) {
        return {
          detectedName: name,
          confidence: 0.60,
          detectionMethod: 'ocr_scan'
        };
      }
    }

    return { detectedName: null, confidence: 0, detectionMethod: 'none' };
  }

  private static isValidName(name: string): boolean {
    // Basic validation for names
    const trimmedName = name.trim();
    
    // Must be between 2 and 50 characters
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return false;
    }

    // Must contain at least one space (first + last name)
    if (!trimmedName.includes(' ')) {
      return false;
    }

    // Must start with a letter
    if (!/^[A-Za-z]/.test(trimmedName)) {
      return false;
    }

    // Should only contain letters, spaces, hyphens, apostrophes, and periods
    if (!/^[A-Za-z\s\-\'\.]+$/.test(trimmedName)) {
      return false;
    }

    // Should have at least 2 words
    const words = trimmedName.split(/\s+/);
    if (words.length < 2) {
      return false;
    }

    // Each word should be at least 1 character and start with a letter
    for (const word of words) {
      if (word.length < 1 || !/^[A-Za-z]/.test(word)) {
        return false;
      }
    }

    return true;
  }

  private static isCommonNonName(text: string): boolean {
    const commonNonNames = [
      'test', 'exam', 'quiz', 'assignment', 'homework', 'name', 'student name',
      'answer key', 'answer sheet', 'multiple choice', 'true false', 'essay question',
      'page', 'question', 'number', 'date', 'class', 'subject', 'grade', 'score',
      'points possible', 'time limit', 'instructions', 'directions'
    ];

    const lowerText = text.toLowerCase().trim();
    return commonNonNames.some(nonName => lowerText.includes(nonName));
  }

  static extractStudentNames(files: Array<{ fileName: string; extractedText: string }>): Array<{ fileName: string; detectedName: string | null; confidence: number }> {
    console.log(`🔍 StudentNameDetectionService: Extracting names from ${files.length} files`);
    
    return files.map(file => {
      const result = this.detectStudentName(file.extractedText, file.fileName);
      return {
        fileName: file.fileName,
        detectedName: result.detectedName,
        confidence: result.confidence
      };
    });
  }

  static groupFilesByStudentName(files: Array<{ fileName: string; extractedText: string; structuredData?: any }>): Map<string, any[]> {
    console.log(`📊 StudentNameDetectionService: Grouping ${files.length} files by student name`);
    
    const groups = new Map<string, any[]>();
    
    for (const file of files) {
      const nameResult = this.detectStudentName(file.extractedText, file.fileName);
      const studentKey = nameResult.detectedName || 'Unknown_Student';
      
      if (!groups.has(studentKey)) {
        groups.set(studentKey, []);
      }
      
      groups.get(studentKey)!.push({
        ...file,
        detectedStudentName: nameResult.detectedName,
        nameConfidence: nameResult.confidence,
        nameDetectionMethod: nameResult.detectionMethod
      });
    }
    
    console.log(`📋 Created ${groups.size} student groups:`, Array.from(groups.keys()));
    return groups;
  }
}
