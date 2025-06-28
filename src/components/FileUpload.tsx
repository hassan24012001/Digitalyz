import React, { useCallback, useState } from 'react';
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import { processFile } from '@/utils/fileParser';
import { dataValidator } from '@/utils/validator';
import { DataType, FileProcessingResult } from '@/types';
import { formatFileSize } from '@/lib/utils';

interface FileUploadProps {
  dataType: DataType;
  onFileProcessed: (result: FileProcessingResult) => void;
  existingFile?: File | null;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  dataType,
  onFileProcessed,
  existingFile,
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      return 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)';
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }
    
    return null;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (disabled) return;
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Step 1: Reading file
      setProcessingStep('Reading file...');
      setProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time

      // Step 2: AI header mapping
      setProcessingStep('AI header mapping...');
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Processing data
      setProcessingStep('Processing data...');
      setProgress(70);
      const result = await processFile(file, dataType);

      // Step 4: Running validations
      setProcessingStep('Running validations...');
      setProgress(90);
      if (result.success) {
        const validation = dataValidator.validate(result.data, dataType);
        result.validation = validation;
      }

      // Step 5: Complete
      setProcessingStep('Complete!');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      onFileProcessed(result);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      setProgress(0);
    }
  }, [dataType, onFileProcessed, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const getIcon = () => {
    if (isProcessing) return <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />;
    if (existingFile) return <CheckCircle className="h-8 w-8 text-green-600" />;
    if (error) return <AlertCircle className="h-8 w-8 text-red-600" />;
    return <Upload className="h-8 w-8 text-gray-400" />;
  };

  const getTitle = () => {
    if (isProcessing) return processingStep;
    if (existingFile) return existingFile.name;
    if (error) return 'Upload failed';
    return 'Drop file here or click to upload';
  };

  const getSubtitle = () => {
    if (isProcessing) return `${progress}% complete`;
    if (existingFile) return `${formatFileSize(existingFile.size)} • Click to replace`;
    if (error) return error;
    return 'CSV or XLSX, up to 10MB';
  };

  return (
    <div className="space-y-4">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer ${
          dragOver && !disabled
            ? 'border-indigo-500 bg-indigo-50' 
            : existingFile && !error
            ? 'border-green-300 bg-green-50'
            : error
            ? 'border-red-300 bg-red-50'
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isProcessing && document.getElementById(`file-input-${dataType}`)?.click()}
      >
        <input
          id={`file-input-${dataType}`}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={disabled || isProcessing}
          aria-label={`Upload ${dataType} file`}
          title={`Upload ${dataType} file`}
        />
        
        <div className="text-center">
          <div className={`mb-4 ${dragOver ? 'animate-bounce' : ''}`}>
            {getIcon()}
          </div>
          
          <div className="space-y-2">
            <p className={`font-medium ${
              error ? 'text-red-900' : 
              existingFile ? 'text-green-900' : 
              isProcessing ? 'text-indigo-900' : 
              'text-gray-900'
            }`}>
              {getTitle()}
            </p>
            
            <p className={`text-sm ${
              error ? 'text-red-600' : 
              existingFile ? 'text-green-600' : 
              isProcessing ? 'text-indigo-600' : 
              'text-gray-500'
            }`}>
              {getSubtitle()}
            </p>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {existingFile && !isProcessing && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`file-input-${dataType}`)?.click()}
            disabled={disabled}
          >
            <File className="h-4 w-4 mr-2" />
            Replace File
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 