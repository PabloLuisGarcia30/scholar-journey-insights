
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
    quality?: 'high' | 'medium' | 'low';
    orientation?: 'portrait' | 'landscape';
    pageCount?: number;
  };
}

export interface FilePreview {
  file: File;
  previewUrl: string;
  thumbnail: string;
  metadata: FileValidationResult['metadata'];
}

export class FileValidationService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  private static readonly MIN_DIMENSIONS = { width: 200, height: 200 };
  private static readonly MAX_DIMENSIONS = { width: 4096, height: 4096 };

  static async validateFile(file: File): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let metadata: FileValidationResult['metadata'] = {
      size: file.size,
      type: file.type
    };

    // Basic validation
    if (!this.SUPPORTED_TYPES.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}. Supported types: JPEG, PNG, WebP, PDF`);
    }

    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size too large: ${this.formatFileSize(file.size)}. Maximum allowed: ${this.formatFileSize(this.MAX_FILE_SIZE)}`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Image-specific validation
    if (file.type.startsWith('image/')) {
      try {
        const imageMetadata = await this.analyzeImage(file);
        metadata = { ...metadata, ...imageMetadata };

        if (imageMetadata.dimensions) {
          const { width, height } = imageMetadata.dimensions;
          
          if (width < this.MIN_DIMENSIONS.width || height < this.MIN_DIMENSIONS.height) {
            errors.push(`Image too small: ${width}x${height}. Minimum: ${this.MIN_DIMENSIONS.width}x${this.MIN_DIMENSIONS.height}`);
          }

          if (width > this.MAX_DIMENSIONS.width || height > this.MAX_DIMENSIONS.height) {
            warnings.push(`Large image: ${width}x${height}. This may slow processing.`);
          }

          // Check aspect ratio for test documents
          const aspectRatio = width / height;
          if (aspectRatio < 0.5 || aspectRatio > 2.0) {
            warnings.push('Unusual aspect ratio detected. Ensure document is properly oriented.');
          }
        }

        if (imageMetadata.quality === 'low') {
          warnings.push('Low image quality detected. This may affect OCR accuracy.');
        }
      } catch (error) {
        errors.push('Failed to analyze image properties');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  static async createPreview(file: File): Promise<FilePreview> {
    const validation = await this.validateFile(file);
    let previewUrl: string;
    let thumbnail: string;

    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
      thumbnail = await this.createThumbnail(file);
    } else if (file.type === 'application/pdf') {
      // For PDFs, create a placeholder preview
      previewUrl = this.createPDFPreview();
      thumbnail = previewUrl;
    } else {
      previewUrl = this.createGenericPreview(file.type);
      thumbnail = previewUrl;
    }

    return {
      file,
      previewUrl,
      thumbnail,
      metadata: validation.metadata
    };
  }

  private static async analyzeImage(file: File): Promise<Partial<FileValidationResult['metadata']>> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const { width, height } = img;
        
        // Determine orientation
        const orientation = width > height ? 'landscape' : 'portrait';
        
        // Assess quality based on file size vs dimensions
        const pixelCount = width * height;
        const bitsPerPixel = (file.size * 8) / pixelCount;
        let quality: 'high' | 'medium' | 'low';
        
        if (bitsPerPixel > 16) quality = 'high';
        else if (bitsPerPixel > 8) quality = 'medium';
        else quality = 'low';

        resolve({
          dimensions: { width, height },
          orientation,
          quality
        });

        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        resolve({});
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private static async createThumbnail(file: File, maxSize: number = 150): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const { width, height } = img;
        const aspectRatio = width / height;
        
        let newWidth, newHeight;
        if (width > height) {
          newWidth = maxSize;
          newHeight = maxSize / aspectRatio;
        } else {
          newHeight = maxSize;
          newWidth = maxSize * aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private static createPDFPreview(): string {
    // Create a simple PDF icon as data URL
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2"/>
        <text x="50" y="40" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">PDF</text>
        <text x="50" y="60" text-anchor="middle" font-family="Arial" font-size="8" fill="#6b7280">Document</text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  private static createGenericPreview(fileType: string): string {
    const extension = fileType.split('/')[1]?.toUpperCase() || 'FILE';
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#f9fafb" stroke="#e5e7eb" stroke-width="2"/>
        <text x="50" y="50" text-anchor="middle" font-family="Arial" font-size="10" fill="#374151">${extension}</text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static validateBatch(files: File[]): { valid: File[]; invalid: File[]; warnings: string[] } {
    const valid: File[] = [];
    const invalid: File[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      // This is a synchronous check for basic validation
      if (this.SUPPORTED_TYPES.includes(file.type) && 
          file.size > 0 && 
          file.size <= this.MAX_FILE_SIZE) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    }

    if (files.length > 5) {
      warnings.push('Processing many files simultaneously may take longer');
    }

    return { valid, invalid, warnings };
  }
}
