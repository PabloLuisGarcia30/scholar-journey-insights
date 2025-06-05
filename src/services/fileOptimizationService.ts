
export interface OptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxSizeBytes: number;
  format: 'jpeg' | 'png' | 'webp';
}

export const defaultOptimizationOptions: OptimizationOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.8,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  format: 'jpeg'
};

export class FileOptimizationService {
  static async optimizeImage(
    file: File,
    options: Partial<OptimizationOptions> = {}
  ): Promise<File> {
    const config = { ...defaultOptimizationOptions, ...options };
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = this.calculateOptimalDimensions(
            img.width,
            img.height,
            config.maxWidth,
            config.maxHeight
          );
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const optimizedFile = new File([blob], file.name, {
                type: `image/${config.format}`,
                lastModified: Date.now(),
              });
              
              console.log(`Image optimized: ${file.size} -> ${optimizedFile.size} bytes`);
              resolve(optimizedFile);
            },
            `image/${config.format}`,
            config.quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static async processFileForUpload(file: File): Promise<{
    optimizedFile: File;
    compressionRatio: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      let optimizedFile = file;
      
      // Only optimize images
      if (file.type.startsWith('image/')) {
        // Check if optimization is needed
        if (file.size > defaultOptimizationOptions.maxSizeBytes) {
          console.log('File size exceeds limit, optimizing...');
          optimizedFile = await this.optimizeImage(file);
        }
      }
      
      const processingTime = Date.now() - startTime;
      const compressionRatio = file.size > 0 ? optimizedFile.size / file.size : 1;
      
      return {
        optimizedFile,
        compressionRatio,
        processingTime
      };
    } catch (error) {
      console.error('File optimization failed:', error);
      // Return original file if optimization fails
      return {
        optimizedFile: file,
        compressionRatio: 1,
        processingTime: Date.now() - startTime
      };
    }
  }

  static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;
    
    // Scale down if too large
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  static async convertFileToBase64Chunked(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
