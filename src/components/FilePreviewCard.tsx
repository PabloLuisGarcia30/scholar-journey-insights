
import React from 'react';
import { X, AlertTriangle, CheckCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilePreview, FileValidationResult } from '@/services/fileValidationService';

interface FilePreviewCardProps {
  preview: FilePreview;
  validation: FileValidationResult;
  onRemove: () => void;
  className?: string;
}

export const FilePreviewCard: React.FC<FilePreviewCardProps> = ({
  preview,
  validation,
  onRemove,
  className = ''
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (preview.file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getValidationBadge = () => {
    if (!validation.isValid) {
      return <Badge variant="destructive" className="text-xs">Invalid</Badge>;
    }
    if (validation.warnings.length > 0) {
      return <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">Warnings</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-green-300 text-green-700">Valid</Badge>;
  };

  return (
    <Card className={`relative ${className} ${!validation.isValid ? 'border-red-300' : ''}`}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-100"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
      
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Preview/Thumbnail */}
          <div className="flex-shrink-0">
            {preview.file.type.startsWith('image/') ? (
              <img
                src={preview.thumbnail}
                alt={preview.file.name}
                className="w-16 h-16 object-cover rounded border"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                {getFileIcon()}
              </div>
            )}
          </div>
          
          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {preview.file.name}
              </h4>
              {getValidationBadge()}
            </div>
            
            <div className="mt-1 space-y-1">
              <div className="text-xs text-gray-600">
                {formatFileSize(preview.file.size)} • {preview.file.type}
              </div>
              
              {preview.metadata.dimensions && (
                <div className="text-xs text-gray-600">
                  {preview.metadata.dimensions.width} × {preview.metadata.dimensions.height}
                  {preview.metadata.orientation && (
                    <span className="ml-2">({preview.metadata.orientation})</span>
                  )}
                </div>
              )}
              
              {preview.metadata.quality && (
                <div className="text-xs">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      preview.metadata.quality === 'high' ? 'border-green-300 text-green-700' :
                      preview.metadata.quality === 'medium' ? 'border-yellow-300 text-yellow-700' :
                      'border-red-300 text-red-700'
                    }`}
                  >
                    {preview.metadata.quality} quality
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Validation messages */}
            {validation.errors.length > 0 && (
              <div className="mt-2">
                {validation.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div className="mt-2">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-1 text-xs text-yellow-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
            
            {validation.isValid && validation.warnings.length === 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Ready for processing</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
