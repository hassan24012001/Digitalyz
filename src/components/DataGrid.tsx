import React, { useState, useCallback, useMemo } from 'react';
import { Edit2, Save, X, Plus, Trash2, Search, ArrowUpDown } from 'lucide-react';
import Button from './ui/Button';
import { ValidationError, DataType } from '@/types';
import { cn } from '@/lib/utils';

interface DataGridProps {
  data: any[];
  dataType: DataType;
  validationErrors?: ValidationError[];
  onDataChange: (data: any[]) => void;
  isReadOnly?: boolean;
}

interface EditingCell {
  row: number;
  column: string;
}

const DataGrid: React.FC<DataGridProps> = ({
  data,
  dataType,
  validationErrors = [],
  onDataChange,
  isReadOnly = false
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Get columns from data
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  // Get validation errors for a specific cell
  const getCellErrors = useCallback((rowIndex: number, column: string) => {
    return validationErrors.filter(error => 
      error.row === rowIndex && error.column === column
    );
  }, [validationErrors]);

  // Handle sorting
  const handleSort = useCallback((column: string) => {
    setSortConfig(current => {
      if (current?.key === column) {
        return current.direction === 'asc' 
          ? { key: column, direction: 'desc' }
          : null;
      }
      return { key: column, direction: 'asc' };
    });
  }, []);

  // Handle cell editing
  const startEdit = useCallback((rowIndex: number, column: string) => {
    if (isReadOnly) return;
    
    const value = processedData[rowIndex][column];
    setEditingCell({ row: rowIndex, column });
    setEditValue(Array.isArray(value) ? value.join(', ') : String(value || ''));
  }, [processedData, isReadOnly]);

  const saveEdit = useCallback(() => {
    if (!editingCell) return;

    const newData = [...data];
    const rowIndex = editingCell.row;
    const column = editingCell.column;
    
    // Parse value based on field type
    let parsedValue: any = editValue;
    
    // Handle arrays (skills, task IDs, etc.)
    if (column.includes('Skills') || column.includes('TaskIDs') || column.includes('Phases')) {
      parsedValue = editValue.split(',').map(s => s.trim()).filter(s => s);
    }
    // Handle numbers
    else if (column.includes('Level') || column.includes('Duration') || column.includes('Load') || column.includes('Concurrent')) {
      const num = parseFloat(editValue);
      parsedValue = isNaN(num) ? null : num;
    }
    // Handle JSON
    else if (column.includes('JSON') || column.includes('Attributes')) {
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }
    }

    newData[rowIndex][column] = parsedValue;
    onDataChange(newData);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, data, onDataChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Handle row operations
  const addRow = useCallback(() => {
    if (isReadOnly) return;
    
    const newRow: any = {};
    columns.forEach(column => {
      newRow[column] = '';
    });
    
    onDataChange([...data, newRow]);
  }, [data, columns, onDataChange, isReadOnly]);

  const deleteRow = useCallback((rowIndex: number) => {
    if (isReadOnly) return;
    
    const newData = data.filter((_, index) => index !== rowIndex);
    onDataChange(newData);
  }, [data, onDataChange, isReadOnly]);

  // Render cell content
  const renderCell = useCallback((rowIndex: number, column: string, value: any) => {
    const cellErrors = getCellErrors(rowIndex, column);
    const hasErrors = cellErrors.length > 0;
    const isEditing = editingCell?.row === rowIndex && editingCell?.column === column;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
            aria-label={`Edit ${column}`}
            title={`Edit ${column}`}
          />
          <Button size="sm" onClick={saveEdit} className="p-1">
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={cancelEdit} className="p-1">
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    const displayValue = Array.isArray(value) 
      ? value.join(', ') 
      : typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value || '');

    return (
      <div 
        className={cn(
          "p-2 cursor-pointer hover:bg-gray-50 rounded transition-colors min-h-[2rem] flex items-center",
          hasErrors && "bg-red-50 border border-red-200",
          !isReadOnly && "group"
        )}
        onClick={() => startEdit(rowIndex, column)}
        title={hasErrors ? cellErrors.map(e => e.message).join('; ') : undefined}
      >
        <span className={cn(
          "truncate max-w-[200px]",
          hasErrors && "text-red-900"
        )}>
          {displayValue}
        </span>
        {!isReadOnly && (
          <Edit2 className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 text-gray-400" />
        )}
        {hasErrors && (
          <span className="ml-2 text-red-500 text-xs">⚠</span>
        )}
      </div>
    );
  }, [editingCell, editValue, getCellErrors, startEdit, saveEdit, cancelEdit, isReadOnly]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No data uploaded yet</p>
        {!isReadOnly && (
          <Button onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Search data"
              title="Search data"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            {processedData.length} of {data.length} rows
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column}</span>
                      <ArrowUpDown className="h-3 w-3" />
                      {sortConfig?.key === column && (
                        <span className="text-indigo-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {!isReadOnly && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-2 whitespace-nowrap text-sm">
                      {renderCell(rowIndex, column, row[column])}
                    </td>
                  ))}
                  {!isReadOnly && (
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRow(rowIndex)}
                        className="p-1"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>Total rows: {data.length}</p>
        {validationErrors.length > 0 && (
          <p className="text-red-600">
            Validation errors: {validationErrors.filter(e => e.type === 'error').length} errors, 
            {' '}{validationErrors.filter(e => e.type === 'warning').length} warnings
          </p>
        )}
      </div>
    </div>
  );
};

export default DataGrid; 