// Core data entity interfaces
export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number; // 1-5
  RequestedTaskIDs: string[];
  GroupTag?: string;
  AttributesJSON?: Record<string, unknown>;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string[];
  AvailableSlots: number[];
  MaxLoadPerPhase: number;
  WorkerGroup?: string;
  QualificationLevel?: number;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string[];
  PreferredPhases?: number[];
  MaxConcurrent?: number;
}

// Validation system interfaces
export interface ValidationError {
  id: string;
  type: 'error' | 'warning';
  severity: 'high' | 'medium' | 'low';
  entity: 'clients' | 'workers' | 'tasks';
  row: number;
  column: string;
  message: string;
  value: unknown;
  suggestion?: string;
  autoFixAvailable?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  confidence: number; // 0-100
  summary: {
    totalErrors: number;
    totalWarnings: number;
    validRows: number;
    totalRows: number;
  };
}

// Business rules interfaces
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  type: 'allocation' | 'constraint' | 'priority' | 'dependency';
  active: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number; // 1-10
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: unknown;
  entity: 'clients' | 'workers' | 'tasks';
}

export interface RuleAction {
  type: 'assign' | 'restrict' | 'prioritize' | 'group';
  target: string;
  value: unknown;
}

// Priority settings interface
export interface PrioritySettings {
  clientPriorityWeight: number; // 0-100
  skillMatchWeight: number; // 0-100
  workloadBalanceWeight: number; // 0-100
  deadlineWeight: number; // 0-100
  costOptimizationWeight: number; // 0-100
}

// File processing interfaces
export interface FileProcessingResult {
  success: boolean;
  data: Record<string, unknown>[];
  headers: string[];
  mappedHeaders: Record<string, string>;
  validation: ValidationResult;
  aiConfidence: number;
  processingTime: number;
}

export interface ExportConfig {
  includeValidationReport: boolean;
  includeBusinessRules: boolean;
  format: 'csv' | 'xlsx' | 'json';
  onlyValidData: boolean;
}

// UI state interfaces
export interface UIState {
  activeTab: string;
  isLoading: boolean;
  showAIInsights: boolean;
  selectedRows: string[];
  editingCell: { row: number; column: string } | null;
}

// Utility types
export type DataType = 'clients' | 'workers' | 'tasks';
export type FileType = 'csv' | 'xlsx' | 'xls'; 