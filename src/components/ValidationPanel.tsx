import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Zap, X } from 'lucide-react';
import Button from './ui/Button';
import { ValidationError, ValidationResult } from '@/types';
import { cn } from '@/lib/utils';

interface ValidationPanelProps {
  validationResult: ValidationResult;
  onFixError?: (errorId: string) => void;
  onIgnoreError?: (errorId: string) => void;
  className?: string;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationResult,
  onFixError,
  onIgnoreError,
  className
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['errors']));
  const [ignoredErrors, setIgnoredErrors] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleIgnoreError = useCallback((errorId: string) => {
    setIgnoredErrors(prev => new Set(prev).add(errorId));
    onIgnoreError?.(errorId);
  }, [onIgnoreError]);

  const getStatusIcon = () => {
    if (validationResult.isValid) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (validationResult.errors.length > 0) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusText = () => {
    if (validationResult.isValid) {
      return 'All validations passed';
    }
    const errors = validationResult.errors.filter(e => !ignoredErrors.has(e.id));
    const warnings = validationResult.warnings.filter(e => !ignoredErrors.has(e.id));
    
    if (errors.length > 0) {
      return `${errors.length} error${errors.length !== 1 ? 's' : ''} found`;
    }
    return `${warnings.length} warning${warnings.length !== 1 ? 's' : ''} found`;
  };

  const getStatusColor = () => {
    if (validationResult.isValid) return 'text-green-700';
    if (validationResult.errors.length > 0) return 'text-red-700';
    return 'text-yellow-700';
  };

  const getConfidenceColor = () => {
    if (validationResult.confidence >= 90) return 'text-green-600';
    if (validationResult.confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBarColor = () => {
    if (validationResult.confidence >= 90) return 'bg-green-500';
    if (validationResult.confidence >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const groupErrorsByEntity = (errors: ValidationError[]) => {
    const grouped: Record<string, ValidationError[]> = {};
    errors.filter(e => !ignoredErrors.has(e.id)).forEach(error => {
      if (!grouped[error.entity]) {
        grouped[error.entity] = [];
      }
      grouped[error.entity].push(error);
    });
    return grouped;
  };

  const renderErrorGroup = (entity: string, errors: ValidationError[], type: 'error' | 'warning') => {
    const entityEmoji = {
      clients: '👥',
      workers: '🧑‍💼',
      tasks: '📋'
    };

    return (
      <div key={entity} className="space-y-2">
        <h4 className="font-medium text-gray-900 flex items-center space-x-2">
          <span>{entityEmoji[entity as keyof typeof entityEmoji]}</span>
          <span className="capitalize">{entity}</span>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          )}>
            {errors.length}
          </span>
        </h4>
        
        <div className="space-y-3">
          {errors.map((error) => (
            <div 
              key={error.id}
              className={cn(
                "p-3 rounded-lg border",
                type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded",
                      type === 'error' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                    )}>
                      Row {error.row + 1} • {error.column}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {error.severity} severity
                    </span>
                  </div>
                  
                  <p className={cn(
                    "text-sm font-medium mb-1",
                    type === 'error' ? 'text-red-900' : 'text-yellow-900'
                  )}>
                    {error.message}
                  </p>
                  
                  {error.value !== null && error.value !== undefined && (
                    <p className="text-xs text-gray-600 mb-2">
                      Current value: <code className="bg-gray-100 px-1 rounded">{String(error.value)}</code>
                    </p>
                  )}
                  
                  {error.suggestion && (
                    <p className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200">
                      💡 Suggestion: {error.suggestion}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {error.autoFixAvailable && onFixError && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFixError(error.id)}
                      className="text-xs"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Auto-fix
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleIgnoreError(error.id)}
                    className="text-xs text-gray-500"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Ignore
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const activeErrors = validationResult.errors.filter(e => !ignoredErrors.has(e.id));
  const activeWarnings = validationResult.warnings.filter(e => !ignoredErrors.has(e.id));

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Validation</h3>
            <p className={cn("text-sm", getStatusColor())}>
              {getStatusText()}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">Data Quality</div>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all", getConfidenceBarColor())}
                style={{ width: `${validationResult.confidence}%` }}
              />
            </div>
            <span className={cn("text-sm font-medium", getConfidenceColor())}>
              {validationResult.confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{validationResult.summary.totalRows}</div>
          <div className="text-xs text-gray-500">Total Rows</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{validationResult.summary.validRows}</div>
          <div className="text-xs text-green-600">Valid Rows</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{activeErrors.length}</div>
          <div className="text-xs text-red-600">Errors</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{activeWarnings.length}</div>
          <div className="text-xs text-yellow-600">Warnings</div>
        </div>
      </div>

      {/* Errors Section */}
      {activeErrors.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => toggleCategory('errors')}
            className="flex items-center space-x-2 w-full text-left p-2 rounded hover:bg-gray-50"
          >
            {expandedCategories.has('errors') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="font-medium text-red-900">
              Errors ({activeErrors.length})
            </span>
          </button>

          {expandedCategories.has('errors') && (
            <div className="mt-4 space-y-6">
              {Object.entries(groupErrorsByEntity(activeErrors)).map(([entity, errors]) =>
                renderErrorGroup(entity, errors, 'error')
              )}
            </div>
          )}
        </div>
      )}

      {/* Warnings Section */}
      {activeWarnings.length > 0 && (
        <div>
          <button
            onClick={() => toggleCategory('warnings')}
            className="flex items-center space-x-2 w-full text-left p-2 rounded hover:bg-gray-50"
          >
            {expandedCategories.has('warnings') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-900">
              Warnings ({activeWarnings.length})
            </span>
          </button>

          {expandedCategories.has('warnings') && (
            <div className="mt-4 space-y-6">
              {Object.entries(groupErrorsByEntity(activeWarnings)).map(([entity, errors]) =>
                renderErrorGroup(entity, errors, 'warning')
              )}
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {validationResult.isValid && activeErrors.length === 0 && activeWarnings.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-green-900 mb-2">All validations passed!</h4>
          <p className="text-green-700">Your data is ready for processing.</p>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel; 