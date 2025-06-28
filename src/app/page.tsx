'use client';

import React, { useState, useCallback } from 'react';
import FileUpload from '@/components/FileUpload';
import DataGrid from '@/components/DataGrid';
import ValidationPanel from '@/components/ValidationPanel';
import BusinessRulesPanel from '@/components/BusinessRulesPanel';
import PriorityPanel from '@/components/PriorityPanel';
import ExportPanel from '@/components/ExportPanel';
import { 
  FileProcessingResult, 
  ValidationResult, 
  BusinessRule, 
  PrioritySettings, 
  DataType,
  Client,
  Worker,
  Task
} from '@/types';
import { dataValidator } from '@/utils/validator';

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState<Record<DataType, File | null>>({
    clients: null,
    workers: null,
    tasks: null
  });
  
  const [fileData, setFileData] = useState<{
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  }>({
    clients: [],
    workers: [],
    tasks: []
  });

  const [validationResults, setValidationResults] = useState<Record<DataType, ValidationResult>>({
    clients: { isValid: true, errors: [], warnings: [], confidence: 100, summary: { totalErrors: 0, totalWarnings: 0, validRows: 0, totalRows: 0 } },
    workers: { isValid: true, errors: [], warnings: [], confidence: 100, summary: { totalErrors: 0, totalWarnings: 0, validRows: 0, totalRows: 0 } },
    tasks: { isValid: true, errors: [], warnings: [], confidence: 100, summary: { totalErrors: 0, totalWarnings: 0, validRows: 0, totalRows: 0 } }
  });

  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [prioritySettings, setPrioritySettings] = useState<PrioritySettings>({
    clientPriorityWeight: 30,
    skillMatchWeight: 25,
    workloadBalanceWeight: 20,
    deadlineWeight: 15,
    costOptimizationWeight: 10
  });

  const tabs = [
    { id: 'upload', name: 'Data Upload', icon: '📤' },
    { id: 'clients', name: 'Clients', icon: '👥' },
    { id: 'workers', name: 'Workers', icon: '🧑‍💼' },
    { id: 'tasks', name: 'Tasks', icon: '📋' },
    { id: 'validation', name: 'Validation', icon: '✅' },
    { id: 'rules', name: 'Business Rules', icon: '⚙️' },
    { id: 'priorities', name: 'Priorities', icon: '🎯' },
    { id: 'export', name: 'Export', icon: '💾' },
  ];

  const handleFileProcessed = useCallback((result: FileProcessingResult, dataType: DataType) => {
    if (result.success) {
      setFileData(prev => ({ ...prev, [dataType]: result.data }));
      setValidationResults(prev => ({ ...prev, [dataType]: result.validation }));
      
      // Re-run cross-validation if we have data for multiple entities
      const allData = {
        ...fileData,
        [dataType]: result.data
      };
      
      if (allData.clients.length > 0 || allData.workers.length > 0 || allData.tasks.length > 0) {
        // Run cross-entity validation
        Object.keys(allData).forEach(entityType => {
          const entity = entityType as DataType;
          if (allData[entity].length > 0) {
            const validation = dataValidator.validate(allData[entity], entity, allData);
            setValidationResults(prev => ({ ...prev, [entity]: validation }));
          }
        });
      }
    }
  }, [fileData]);

  const handleDataChange = useCallback((newData: (Client | Worker | Task)[], dataType: DataType) => {
    setFileData(prev => ({ ...prev, [dataType]: newData }));
    
    // Re-validate when data changes
    const allData = {
      ...fileData,
      [dataType]: newData
    };
    
    const validation = dataValidator.validate(newData, dataType, allData);
    setValidationResults(prev => ({ ...prev, [dataType]: validation }));
  }, [fileData]);

  const getOverallStatus = () => {
    const totalFiles = Object.values(uploadedFiles).filter(Boolean).length;
    const totalErrors = Object.values(validationResults).reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = Object.values(validationResults).reduce((sum, result) => sum + result.warnings.length, 0);
    
    return { totalFiles, totalErrors, totalWarnings };
  };

  const status = getOverallStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
                <span className="text-white text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Data Alchemist</h1>
                <p className="text-sm text-gray-500">AI-Powered Resource Allocation Configurator</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {status.totalFiles > 0 ? (
                  <>
                <span className="text-green-600">✅</span>
                    <span className="text-sm text-green-600">
                      {status.totalFiles} file{status.totalFiles !== 1 ? 's' : ''} loaded
                    </span>
                    {status.totalErrors > 0 && (
                      <>
                        <span className="text-red-600">•</span>
                        <span className="text-sm text-red-600">{status.totalErrors} errors</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-gray-400">📤</span>
                    <span className="text-sm text-gray-500">Ready for upload</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-2xl">✨</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Transform Your Data into Intelligent Allocations
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Upload your CSV or XLSX files for clients, workers, and tasks. Our AI will parse, validate, and help you create rules for optimal resource allocation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['clients', 'workers', 'tasks'] as DataType[]).map((dataType) => {
                const config = {
                  clients: {
                  title: 'Clients Data',
                  description: 'Client information with priorities and task requests',
                    emoji: '👥'
                },
                  workers: {
                  title: 'Workers Data',
                  description: 'Worker profiles with skills and availability',
                    emoji: '🧑‍💼'
                },
                  tasks: {
                  title: 'Tasks Data',
                  description: 'Task definitions with requirements and duration',
                    emoji: '📋'
                  }
                }[dataType];

                return (
                  <div key={dataType} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-2xl">{config.emoji}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
                  </div>
                  
                    <p className="text-sm text-gray-600 mb-6">{config.description}</p>
                    
                    <FileUpload
                      dataType={dataType}
                      onFileProcessed={(result) => {
                        if (result.success) {
                          setUploadedFiles(prev => ({ ...prev, [dataType]: new File([], `${dataType}.csv`) }));
                        }
                        handleFileProcessed(result, dataType);
                      }}
                      existingFile={uploadedFiles[dataType]}
                    />

                    {fileData[dataType].length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600">
                            ✅ {fileData[dataType].length} rows loaded
                      </span>
                          <button 
                            onClick={() => setActiveTab(dataType)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            View Data →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Tabs */}
        {(['clients', 'workers', 'tasks'] as DataType[]).includes(activeTab as DataType) && (
          <DataGrid
            data={fileData[activeTab as DataType] as unknown as Record<string, unknown>[]}
            dataType={activeTab as DataType}
            validationErrors={validationResults[activeTab as DataType].errors}
            onDataChange={(newData) => handleDataChange(newData as unknown as (Client | Worker | Task)[], activeTab as DataType)}
          />
        )}

        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <div className="space-y-8">
            {(['clients', 'workers', 'tasks'] as DataType[]).map((dataType) => (
              fileData[dataType].length > 0 && (
                <ValidationPanel
                  key={dataType}
                  validationResult={validationResults[dataType]}
                />
              )
            ))}
            
            {Object.values(fileData).every(data => data.length === 0) && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📊</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data to validate</h3>
                <p className="text-gray-500">Upload data files first to see validation results</p>
              </div>
            )}
          </div>
        )}

        {/* Business Rules Tab */}
        {activeTab === 'rules' && (
          <BusinessRulesPanel
            rules={businessRules}
            onRulesChange={setBusinessRules}
            availableData={fileData}
          />
        )}

        {/* Priorities Tab */}
        {activeTab === 'priorities' && (
          <PriorityPanel
            settings={prioritySettings}
            onSettingsChange={setPrioritySettings}
          />
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <ExportPanel
            data={fileData}
            businessRules={businessRules}
            prioritySettings={prioritySettings}
          />
        )}

      </main>
    </div>
  );
}
