import { ValidationError, ValidationResult, Client, Worker, Task, DataType } from '@/types';
import { generateId } from '@/lib/utils';

// Validation rule implementations
class DataValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  // Main validation function
  validate(data: any[], dataType: DataType, allData?: { clients: Client[], workers: Worker[], tasks: Task[] }): ValidationResult {
    this.errors = [];
    this.warnings = [];

    switch (dataType) {
      case 'clients':
        this.validateClients(data as Client[], allData);
        break;
      case 'workers':
        this.validateWorkers(data as Worker[], allData);
        break;
      case 'tasks':
        this.validateTasks(data as Task[], allData);
        break;
    }

    // Cross-entity validations if all data is available
    if (allData) {
      this.validateCrossReferences(allData);
    }

    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    const validRows = data.length - this.errors.filter(e => e.type === 'error').length;
    const confidence = data.length > 0 ? Math.round((validRows / data.length) * 100) : 100;

    return {
      isValid: totalErrors === 0,
      errors: this.errors,
      warnings: this.warnings,
      confidence,
      summary: {
        totalErrors,
        totalWarnings,
        validRows,
        totalRows: data.length
      }
    };
  }

  // Helper methods for adding errors and warnings
  private addError(entity: DataType, row: number, column: string, message: string, value: any, suggestion?: string): void {
    this.errors.push({
      id: generateId(),
      type: 'error',
      severity: 'high',
      entity,
      row,
      column,
      message,
      value,
      suggestion,
      autoFixAvailable: !!suggestion
    });
  }

  private addWarning(entity: DataType, row: number, column: string, message: string, value: any, suggestion?: string): void {
    this.warnings.push({
      id: generateId(),
      type: 'warning',
      severity: 'medium',
      entity,
      row,
      column,
      message,
      value,
      suggestion,
      autoFixAvailable: !!suggestion
    });
  }

  // Validate clients data
  private validateClients(clients: Client[], allData?: any): void {
    const clientIds = new Set<string>();

    clients.forEach((client, index) => {
      // Missing required fields
      if (!client.ClientID) {
        this.addError('clients', index, 'ClientID', 'Missing required field: ClientID', client.ClientID);
      }
      if (!client.ClientName) {
        this.addError('clients', index, 'ClientName', 'Missing required field: ClientName', client.ClientName);
      }
      if (client.PriorityLevel === null || client.PriorityLevel === undefined) {
        this.addError('clients', index, 'PriorityLevel', 'Missing required field: PriorityLevel', client.PriorityLevel);
      }

      // Duplicate IDs
      if (client.ClientID) {
        if (clientIds.has(client.ClientID)) {
          this.addError('clients', index, 'ClientID', `Duplicate ClientID: ${client.ClientID}`, client.ClientID, 'Consider adding a suffix or using a unique identifier');
        }
        clientIds.add(client.ClientID);
      }

      // Out-of-range values
      if (client.PriorityLevel !== null && client.PriorityLevel !== undefined) {
        if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
          this.addError('clients', index, 'PriorityLevel', 'PriorityLevel must be between 1 and 5', client.PriorityLevel, 'Use a value between 1 (lowest) and 5 (highest)');
        }
      }

      // 4. Malformed task IDs list
      if (client.RequestedTaskIDs) {
        if (!Array.isArray(client.RequestedTaskIDs)) {
          this.addError('clients', index, 'RequestedTaskIDs', 'RequestedTaskIDs must be an array', client.RequestedTaskIDs, 'Format as comma-separated values or JSON array');
        } else if (client.RequestedTaskIDs.some(id => !id || typeof id !== 'string')) {
          this.addWarning('clients', index, 'RequestedTaskIDs', 'Some task IDs are empty or invalid', client.RequestedTaskIDs);
        }
      }

      // 5. Broken JSON in attributes
      if (client.AttributesJSON && typeof client.AttributesJSON === 'string') {
        try {
          JSON.parse(client.AttributesJSON);
        } catch {
          this.addError('clients', index, 'AttributesJSON', 'Invalid JSON format in AttributesJSON', client.AttributesJSON, 'Ensure proper JSON syntax with quotes around keys and values');
        }
      }

      // 6. Data quality checks
      if (client.ClientName && client.ClientName.length < 2) {
        this.addWarning('clients', index, 'ClientName', 'Client name seems too short', client.ClientName);
      }
      if (client.GroupTag && !['Enterprise', 'SMB', 'Startup', 'Freelancer'].includes(client.GroupTag)) {
        this.addWarning('clients', index, 'GroupTag', 'Unusual group tag value', client.GroupTag);
      }
    });
  }

  // Validate workers data
  private validateWorkers(workers: Worker[], allData?: any): void {
    const workerIds = new Set<string>();

    workers.forEach((worker, index) => {
      // Missing required fields
      if (!worker.WorkerID) {
        this.addError('workers', index, 'WorkerID', 'Missing required field: WorkerID', worker.WorkerID);
      }
      if (!worker.WorkerName) {
        this.addError('workers', index, 'WorkerName', 'Missing required field: WorkerName', worker.WorkerName);
      }
      if (!worker.Skills || !Array.isArray(worker.Skills) || worker.Skills.length === 0) {
        this.addError('workers', index, 'Skills', 'Missing or empty skills array', worker.Skills, 'Add at least one skill');
      }

      // Duplicate IDs
      if (worker.WorkerID) {
        if (workerIds.has(worker.WorkerID)) {
          this.addError('workers', index, 'WorkerID', `Duplicate WorkerID: ${worker.WorkerID}`, worker.WorkerID);
        }
        workerIds.add(worker.WorkerID);
      }

      // 3. Availability slots validation
      if (worker.AvailableSlots) {
        if (!Array.isArray(worker.AvailableSlots)) {
          this.addError('workers', index, 'AvailableSlots', 'AvailableSlots must be an array', worker.AvailableSlots);
        } else {
          const invalidSlots = worker.AvailableSlots.filter(slot => typeof slot !== 'number' || slot < 0);
          if (invalidSlots.length > 0) {
            this.addError('workers', index, 'AvailableSlots', 'Invalid slot values (must be positive numbers)', invalidSlots);
          }
        }
      }

      // 4. Load validation
      if (worker.MaxLoadPerPhase !== null && worker.MaxLoadPerPhase !== undefined) {
        if (worker.MaxLoadPerPhase <= 0) {
          this.addError('workers', index, 'MaxLoadPerPhase', 'MaxLoadPerPhase must be greater than 0', worker.MaxLoadPerPhase);
        }
        
        // Check if max load exceeds available slots
        if (worker.AvailableSlots && Array.isArray(worker.AvailableSlots)) {
          const maxSlots = Math.max(...worker.AvailableSlots, 0);
          if (worker.MaxLoadPerPhase > maxSlots) {
            this.addWarning('workers', index, 'MaxLoadPerPhase', 'MaxLoadPerPhase exceeds maximum available slots', worker.MaxLoadPerPhase);
          }
        }
      }

      // 5. Skills validation
      if (worker.Skills && Array.isArray(worker.Skills)) {
        const emptySkills = worker.Skills.filter(skill => !skill || typeof skill !== 'string');
        if (emptySkills.length > 0) {
          this.addWarning('workers', index, 'Skills', 'Some skills are empty or invalid', emptySkills);
        }
      }

      // 6. Data quality checks
      if (worker.WorkerName && worker.WorkerName.length < 2) {
        this.addWarning('workers', index, 'WorkerName', 'Worker name seems too short', worker.WorkerName);
      }
      if (worker.QualificationLevel !== null && worker.QualificationLevel !== undefined) {
        if (worker.QualificationLevel < 1 || worker.QualificationLevel > 10) {
          this.addWarning('workers', index, 'QualificationLevel', 'Unusual qualification level (expected 1-10)', worker.QualificationLevel);
        }
      }
    });
  }

  // Validate tasks data
  private validateTasks(tasks: Task[], allData?: any): void {
    const taskIds = new Set<string>();

    tasks.forEach((task, index) => {
      // Missing required fields
      if (!task.TaskID) {
        this.addError('tasks', index, 'TaskID', 'Missing required field: TaskID', task.TaskID);
      }
      if (!task.TaskName) {
        this.addError('tasks', index, 'TaskName', 'Missing required field: TaskName', task.TaskName);
      }
      if (!task.Category) {
        this.addError('tasks', index, 'Category', 'Missing required field: Category', task.Category);
      }
      if (task.Duration === null || task.Duration === undefined) {
        this.addError('tasks', index, 'Duration', 'Missing required field: Duration', task.Duration);
      }

      // Duplicate IDs
      if (task.TaskID) {
        if (taskIds.has(task.TaskID)) {
          this.addError('tasks', index, 'TaskID', `Duplicate TaskID: ${task.TaskID}`, task.TaskID);
        }
        taskIds.add(task.TaskID);
      }

      // Duration validation
      if (task.Duration !== null && task.Duration !== undefined) {
        if (task.Duration <= 0) {
          this.addError('tasks', index, 'Duration', 'Duration must be greater than 0', task.Duration);
        }
        if (task.Duration > 1000) {
          this.addWarning('tasks', index, 'Duration', 'Unusually long duration', task.Duration);
        }
      }

      // 4. Required skills validation
      if (task.RequiredSkills) {
        if (!Array.isArray(task.RequiredSkills)) {
          this.addError('tasks', index, 'RequiredSkills', 'RequiredSkills must be an array', task.RequiredSkills);
        } else if (task.RequiredSkills.length === 0) {
          this.addWarning('tasks', index, 'RequiredSkills', 'No required skills specified', task.RequiredSkills);
        } else {
          const emptySkills = task.RequiredSkills.filter(skill => !skill || typeof skill !== 'string');
          if (emptySkills.length > 0) {
            this.addWarning('tasks', index, 'RequiredSkills', 'Some required skills are empty or invalid', emptySkills);
          }
        }
      }

      // 5. Preferred phases validation
      if (task.PreferredPhases) {
        if (!Array.isArray(task.PreferredPhases)) {
          this.addError('tasks', index, 'PreferredPhases', 'PreferredPhases must be an array', task.PreferredPhases);
        } else {
          const invalidPhases = task.PreferredPhases.filter(phase => typeof phase !== 'number' || phase < 1);
          if (invalidPhases.length > 0) {
            this.addError('tasks', index, 'PreferredPhases', 'Invalid phase values (must be positive numbers)', invalidPhases);
          }
        }
      }

      // 6. Max concurrent validation
      if (task.MaxConcurrent !== null && task.MaxConcurrent !== undefined) {
        if (task.MaxConcurrent <= 0) {
          this.addError('tasks', index, 'MaxConcurrent', 'MaxConcurrent must be greater than 0', task.MaxConcurrent);
        }
      }

      // 7. Data quality checks
      if (task.TaskName && task.TaskName.length < 3) {
        this.addWarning('tasks', index, 'TaskName', 'Task name seems too short', task.TaskName);
      }
    });
  }

  // Cross-entity validation
  private validateCrossReferences(allData: { clients: Client[], workers: Worker[], tasks: Task[] }): void {
    const { clients, workers, tasks } = allData;
    const taskIds = new Set(tasks.map(t => t.TaskID));
    const allSkills = new Set(workers.flatMap(w => w.Skills || []));

    // Check client requested task references
    clients.forEach((client, index) => {
      if (client.RequestedTaskIDs && Array.isArray(client.RequestedTaskIDs)) {
        const invalidTaskIds = client.RequestedTaskIDs.filter(taskId => !taskIds.has(taskId));
        if (invalidTaskIds.length > 0) {
          this.addError('clients', index, 'RequestedTaskIDs', `Referenced task IDs not found: ${invalidTaskIds.join(', ')}`, invalidTaskIds);
        }
      }
    });

    // 2. Check skill coverage
    tasks.forEach((task, index) => {
      if (task.RequiredSkills && Array.isArray(task.RequiredSkills)) {
        const uncoveredSkills = task.RequiredSkills.filter(skill => !allSkills.has(skill));
        if (uncoveredSkills.length > 0) {
          this.addWarning('tasks', index, 'RequiredSkills', `No workers have these required skills: ${uncoveredSkills.join(', ')}`, uncoveredSkills);
        }
      }
    });

    // 3. Check phase-slot feasibility
    const maxPhase = Math.max(...workers.flatMap(w => w.AvailableSlots || []), 0);
    tasks.forEach((task, index) => {
      if (task.PreferredPhases && Array.isArray(task.PreferredPhases)) {
        const invalidPhases = task.PreferredPhases.filter(phase => phase > maxPhase);
        if (invalidPhases.length > 0) {
          this.addWarning('tasks', index, 'PreferredPhases', `Some preferred phases exceed worker availability: ${invalidPhases.join(', ')}`, invalidPhases);
        }
      }
    });

    // 4. Check workload feasibility
    const totalTaskDuration = tasks.reduce((sum, task) => sum + (task.Duration || 0), 0);
    const totalWorkerCapacity = workers.reduce((sum, worker) => sum + (worker.MaxLoadPerPhase || 0) * (worker.AvailableSlots?.length || 1), 0);
    
    if (totalTaskDuration > totalWorkerCapacity) {
      this.addWarning('tasks', 0, 'Duration', 'Total task duration may exceed total worker capacity', `${totalTaskDuration} hrs vs ${totalWorkerCapacity} hrs capacity`);
    }
  }
}

// Export singleton instance
export const dataValidator = new DataValidator();

// Auto-fix suggestions
export function generateAutoFix(error: ValidationError): any {
  switch (error.column) {
    case 'PriorityLevel':
      if (typeof error.value === 'number') {
        return Math.max(1, Math.min(5, Math.round(error.value)));
      }
      return 3; // Default priority

    case 'Duration':
      if (typeof error.value === 'number' && error.value <= 0) {
        return 1; // Minimum duration
      }
      return error.value;

    case 'MaxLoadPerPhase':
      if (typeof error.value === 'number' && error.value <= 0) {
        return 8; // Default load
      }
      return error.value;

    case 'RequestedTaskIDs':
    case 'Skills':
    case 'RequiredSkills':
      if (typeof error.value === 'string') {
        return error.value.split(',').map(s => s.trim()).filter(s => s);
      }
      return [];

    case 'AvailableSlots':
    case 'PreferredPhases':
      if (typeof error.value === 'string') {
        return error.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      }
      return [];

    default:
      return error.value;
  }
} 