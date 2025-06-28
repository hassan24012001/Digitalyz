import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { FileProcessingResult, DataType } from '@/types';

// Header mapping configurations for smart recognition
const HEADER_MAPPINGS = {
  clients: {
    ClientID: ['client_id', 'clientid', 'id', 'client', 'client_identifier'],
    ClientName: ['client_name', 'clientname', 'name', 'company', 'organization'],
    PriorityLevel: ['priority_level', 'priority', 'importance', 'urgency'],
    RequestedTaskIDs: ['requested_task_ids', 'requested_tasks', 'tasks', 'task_ids', 'taskids'],
    GroupTag: ['group_tag', 'group', 'category', 'segment', 'type'],
    AttributesJSON: ['attributes_json', 'attributes', 'metadata', 'properties', 'extras']
  },
  workers: {
    WorkerID: ['worker_id', 'workerid', 'id', 'employee_id', 'worker'],
    WorkerName: ['worker_name', 'workername', 'name', 'employee_name', 'full_name'],
    Skills: ['skills', 'skill_set', 'competencies', 'abilities', 'expertise'],
    AvailableSlots: ['available_slots', 'availability', 'slots', 'capacity', 'schedule'],
    MaxLoadPerPhase: ['max_load_per_phase', 'max_load', 'capacity', 'workload_limit'],
    WorkerGroup: ['worker_group', 'group', 'team', 'department', 'division'],
    QualificationLevel: ['qualification_level', 'level', 'experience', 'seniority', 'grade']
  },
  tasks: {
    TaskID: ['task_id', 'taskid', 'id', 'task', 'task_identifier'],
    TaskName: ['task_name', 'taskname', 'name', 'title', 'description'],
    Category: ['category', 'type', 'classification', 'domain', 'area'],
    Duration: ['duration', 'time', 'hours', 'effort', 'estimated_duration'],
    RequiredSkills: ['required_skills', 'skills', 'skill_requirements', 'competencies'],
    PreferredPhases: ['preferred_phases', 'phases', 'timeline', 'schedule', 'periods'],
    MaxConcurrent: ['max_concurrent', 'concurrency', 'parallel_limit', 'simultaneous']
  }
};

// Fuzzy string matching for header recognition
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  return 1 - distance / Math.max(s1.length, s2.length);
}

// Smart header mapping function
function mapHeaders(headers: string[], dataType: DataType): Record<string, string> {
  const mappings = HEADER_MAPPINGS[dataType];
  const result: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  
  Object.entries(mappings).forEach(([standardField, alternatives]) => {
    let bestMatch = '';
    let bestScore = 0;
    
    headers.forEach(header => {
      if (usedHeaders.has(header)) return;
      
      // Direct match
      if (alternatives.includes(header.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        bestMatch = header;
        bestScore = 1;
        return;
      }
      
      // Fuzzy match
      alternatives.forEach(alt => {
        const score = calculateSimilarity(header, alt);
        if (score > bestScore && score > 0.6) {
          bestMatch = header;
          bestScore = score;
        }
      });
    });
    
    if (bestMatch && bestScore > 0.6) {
      result[standardField] = bestMatch;
      usedHeaders.add(bestMatch);
    }
  });
  
  return result;
}

// Data type conversion and cleaning
function convertValue(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined || value === '') return null;
  
  const stringValue = String(value).trim();
  
  // Handle arrays (skills, task IDs, etc.)
  if (fieldName.includes('Skills') || fieldName.includes('TaskIDs') || fieldName.includes('Phases')) {
    if (stringValue.startsWith('[') && stringValue.endsWith(']')) {
      try {
        return JSON.parse(stringValue);
      } catch {
        return stringValue.slice(1, -1).split(',').map(s => s.trim());
      }
    }
    return stringValue.split(',').map(s => s.trim()).filter(s => s);
  }
  
  // Handle JSON fields
  if (fieldName.includes('JSON') || fieldName.includes('Attributes')) {
    try {
      return JSON.parse(stringValue);
    } catch {
      return stringValue;
    }
  }
  
  // Handle numbers
  if (fieldName.includes('Level') || fieldName.includes('Duration') || fieldName.includes('Load') || fieldName.includes('Concurrent')) {
    const num = parseFloat(stringValue);
    return isNaN(num) ? null : num;
  }
  
  // Handle slots/availability arrays
  if (fieldName.includes('Slots')) {
    if (stringValue.startsWith('[') && stringValue.endsWith(']')) {
      try {
        return JSON.parse(stringValue);
      } catch {
        return stringValue.slice(1, -1).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      }
    }
    return stringValue.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  }
  
  return stringValue;
}

// Parse CSV files
async function parseCSV(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
        } else {
          resolve(results.data as Record<string, unknown>[]);
        }
      },
      error: (error) => reject(error)
    });
  });
}

// Parse XLSX files
async function parseXLSX(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsBinaryString(file);
  });
}

// Main file processing function
export async function processFile(file: File, dataType: DataType): Promise<FileProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Validate file
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      throw new Error('Invalid file type. Please upload CSV or Excel files.');
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 10MB.');
    }
    
    // Parse file based on type
    let rawData: Record<string, unknown>[];
    if (fileExtension === '.csv') {
      rawData = await parseCSV(file) as Record<string, unknown>[];
    } else {
      rawData = await parseXLSX(file);
    }
    
    if (!rawData || rawData.length === 0) {
      throw new Error('No data found in file');
    }
    
    // Extract headers
    const headers = Object.keys(rawData[0]);
    
    // Map headers intelligently
    const mappedHeaders = mapHeaders(headers, dataType);
    
    // Convert and clean data
    const processedData = rawData.map((row) => {
      const cleanRow: Record<string, unknown> = {};
      
      Object.entries(mappedHeaders).forEach(([standardField, originalHeader]) => {
        const value = row[originalHeader];
        cleanRow[standardField] = convertValue(value, standardField);
      });
      
      // Add unmapped fields as-is
      headers.forEach(header => {
        if (!Object.values(mappedHeaders).includes(header)) {
          cleanRow[header] = row[header];
        }
      });
      
      return cleanRow;
    });
    
    const processingTime = Date.now() - startTime;
    const aiConfidence = Object.keys(mappedHeaders).length / Object.keys(HEADER_MAPPINGS[dataType]).length * 100;
    
    return {
      success: true,
      data: processedData,
      headers,
      mappedHeaders,
      validation: { isValid: true, errors: [], warnings: [], confidence: 100, summary: { totalErrors: 0, totalWarnings: 0, validRows: processedData.length, totalRows: processedData.length } },
      aiConfidence: Math.round(aiConfidence),
      processingTime
    };
    
  } catch {
    return {
      success: false,
      data: [],
      headers: [],
      mappedHeaders: {},
      validation: { isValid: false, errors: [], warnings: [], confidence: 0, summary: { totalErrors: 1, totalWarnings: 0, validRows: 0, totalRows: 0 } },
      aiConfidence: 0,
      processingTime: Date.now() - startTime
    };
  }
} 