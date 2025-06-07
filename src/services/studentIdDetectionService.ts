
export interface StudentIdDetectionResult {
  detectedId: string | null;
  confidence: number;
  detectionMethod: 'header' | 'form_field' | 'filename' | 'ocr_scan' | 'none';
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class StudentIdDetectionService {
  private static readonly ID_PATTERNS = [
    // Common student ID patterns
    /(?:student\s*id|id|student\s*#|id\s*#)\s*:?\s*([A-Z0-9]{4,12})/i,
    /(?:^|\s)([A-Z]{2,4}\d{4,8})(?:\s|$)/m, // Format: ABC1234, ABCD12345678
    /(?:^|\s)(\d{6,10})(?:\s|$)/m, // Pure numeric IDs: 123456789
    /(?:^|\s)([A-Z]\d{6,9})(?:\s|$)/m, // Format: A1234567
    /(?:^|\s)(\d{2}[A-Z]{2,3}\d{4,6})(?:\s|$)/m, // Format: 22ABC1234
    // Header patterns for generated tests
    /Student\s+ID:\s*([A-Z0-9]{4,12})/i,
    /ID:\s*([A-Z0-9]{4,12})/i
  ];

  static detectStudentId(extractedText: string, fileName?: string): StudentIdDetectionResult {
    console.log('🔍 StudentIdDetectionService: Detecting student ID from text');
    
    // Try header detection first (most reliable for generated tests)
    const headerResult = this.detectFromHeader(extractedText);
    if (headerResult.detectedId) {
      console.log(`✅ Found student ID in header: ${headerResult.detectedId}`);
      return headerResult;
    }

    // Try form field detection
    const formResult = this.detectFromFormFields(extractedText);
    if (formResult.detectedId) {
      console.log(`✅ Found student ID in form field: ${formResult.detectedId}`);
      return formResult;
    }

    // Try general OCR scan
    const ocrResult = this.detectFromOCRScan(extractedText);
    if (ocrResult.detectedId) {
      console.log(`✅ Found student ID via OCR scan: ${ocrResult.detectedId}`);
      return ocrResult;
    }

    // Try filename detection as last resort
    if (fileName) {
      const filenameResult = this.detectFromFilename(fileName);
      if (filenameResult.detectedId) {
        console.log(`✅ Found student ID in filename: ${filenameResult.detectedId}`);
        return filenameResult;
      }
    }

    console.log('❌ No student ID detected');
    return {
      detectedId: null,
      confidence: 0,
      detectionMethod: 'none'
    };
  }

  private static detectFromHeader(text: string): StudentIdDetectionResult {
    // Look for IDs in the first few lines (header area)
    const headerLines = text.split('\n').slice(0, 5).join('\n');
    
    // Pattern for generated test headers: "StudentName ID: 12345"
    const headerPattern = /ID:\s*([A-Z0-9]{4,12})/i;
    const match = headerLines.match(headerPattern);
    
    if (match) {
      const id = match[1].trim();
      if (this.isValidStudentId(id)) {
        return {
          detectedId: id,
          confidence: 0.98,
          detectionMethod: 'header'
        };
      }
    }

    return { detectedId: null, confidence: 0, detectionMethod: 'none' };
  }

  private static detectFromFormFields(text: string): StudentIdDetectionResult {
    // Look for specific form field patterns
    const formPatterns = [
      /(?:Student\s*ID|Student\s*#|ID)\s*:?\s*([A-Z0-9]{4,12})/i,
      /Student:\s*([A-Z0-9]{4,12})/i,
      /ID:\s*([A-Z0-9]{4,12})/i
    ];

    for (const pattern of formPatterns) {
      const match = text.match(pattern);
      if (match) {
        const id = match[1].trim();
        if (this.isValidStudentId(id)) {
          return {
            detectedId: id,
            confidence: 0.95,
            detectionMethod: 'form_field'
          };
        }
      }
    }

    return { detectedId: null, confidence: 0, detectionMethod: 'none' };
  }

  private static detectFromOCRScan(text: string): StudentIdDetectionResult {
    // Look for ID patterns throughout the text
    for (const pattern of this.ID_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const potentialId = match[1]?.trim();
        if (potentialId && this.isValidStudentId(potentialId)) {
          return {
            detectedId: potentialId,
            confidence: 0.90,
            detectionMethod: 'ocr_scan'
          };
        }
      }
    }

    return { detectedId: null, confidence: 0, detectionMethod: 'none' };
  }

  private static detectFromFilename(filename: string): StudentIdDetectionResult {
    // Remove file extension and common test prefixes
    const cleanName = filename
      .replace(/\.(pdf|jpg|jpeg|png|tiff?)$/i, '')
      .replace(/^(test|exam|quiz|assignment)_?/i, '')
      .replace(/_/g, ' ')
      .trim();

    // Look for ID patterns in filename
    for (const pattern of this.ID_PATTERNS) {
      const match = cleanName.match(pattern);
      if (match) {
        const id = match[1].trim();
        if (this.isValidStudentId(id)) {
          return {
            detectedId: id,
            confidence: 0.85,
            detectionMethod: 'filename'
          };
        }
      }
    }

    return { detectedId: null, confidence: 0, detectionMethod: 'none' };
  }

  private static isValidStudentId(id: string): boolean {
    const trimmedId = id.trim();
    
    // Must be between 4 and 12 characters
    if (trimmedId.length < 4 || trimmedId.length > 12) {
      return false;
    }

    // Must contain at least one letter or number
    if (!/[A-Za-z0-9]/.test(trimmedId)) {
      return false;
    }

    // Should only contain letters, numbers, and limited special characters
    if (!/^[A-Za-z0-9\-_]+$/.test(trimmedId)) {
      return false;
    }

    // Exclude common non-ID strings
    const excludePatterns = [
      /^(test|exam|quiz|name|student|answer|key|page|question)$/i,
      /^(true|false|yes|no|none|null)$/i
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(trimmedId)) {
        return false;
      }
    }

    return true;
  }

  static extractStudentIds(files: Array<{ fileName: string; extractedText: string }>): Array<{ fileName: string; detectedId: string | null; confidence: number }> {
    console.log(`🔍 StudentIdDetectionService: Extracting IDs from ${files.length} files`);
    
    return files.map(file => {
      const result = this.detectStudentId(file.extractedText, file.fileName);
      return {
        fileName: file.fileName,
        detectedId: result.detectedId,
        confidence: result.confidence
      };
    });
  }

  static groupFilesByStudentId(files: Array<{ fileName: string; extractedText: string; structuredData?: any }>): Map<string, any[]> {
    console.log(`📊 StudentIdDetectionService: Grouping ${files.length} files by student ID`);
    
    const groups = new Map<string, any[]>();
    
    for (const file of files) {
      const idResult = this.detectStudentId(file.extractedText, file.fileName);
      const studentKey = idResult.detectedId || 'Unknown_Student';
      
      if (!groups.has(studentKey)) {
        groups.set(studentKey, []);
      }
      
      groups.get(studentKey)!.push({
        ...file,
        detectedStudentId: idResult.detectedId,
        idConfidence: idResult.confidence,
        idDetectionMethod: idResult.detectionMethod
      });
    }
    
    console.log(`📋 Created ${groups.size} student groups:`, Array.from(groups.keys()));
    return groups;
  }

  static normalizeStudentId(id: string): string {
    // Normalize ID format for consistent database storage
    return id.toUpperCase().trim();
  }

  static generateFallbackId(fileName: string, index: number): string {
    // Generate a fallback ID when detection fails
    const timestamp = Date.now().toString().slice(-6);
    const filePrefix = fileName.substring(0, 3).toUpperCase();
    return `${filePrefix}${timestamp}${index.toString().padStart(2, '0')}`;
  }
}
