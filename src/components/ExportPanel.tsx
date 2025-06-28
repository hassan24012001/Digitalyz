import React, { useState, useCallback } from 'react';
import { Download, FileText, FileSpreadsheet, Code, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import { ExportConfig, BusinessRule, PrioritySettings } from '@/types';
import { cn } from '@/lib/utils';

interface ExportPanelProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  businessRules: BusinessRule[];
  prioritySettings: PrioritySettings;
  className?: string;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  data,
  businessRules,
  prioritySettings,
  className
}) => {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeValidationReport: true,
    includeBusinessRules: true,
    format: 'xlsx',
    onlyValidData: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const exportFormats = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
    { value: 'csv', label: 'CSV (.csv)', icon: FileText },
    { value: 'json', label: 'JSON (.json)', icon: Code }
  ];

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setExportStatus('Preparing export...');

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (exportConfig.format === 'json') {
        setExportStatus('Creating JSON export...');
        
        const exportData: any = {
          metadata: {
            exportDate: new Date().toISOString(),
            version: '1.0'
          },
          data: {
            clients: data.clients,
            workers: data.workers,
            tasks: data.tasks
          }
        };
        
        if (exportConfig.includeBusinessRules) {
          exportData.configuration = {
            businessRules: businessRules.filter(rule => rule.active),
            prioritySettings,
            configVersion: '1.0',
            generatedAt: new Date().toISOString()
          };
        }
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        downloadFile(jsonContent, `data-alchemist-export-${timestamp}.json`, 'application/json');
      }
      
      if (exportConfig.includeBusinessRules) {
        setExportStatus('Creating rules configuration...');
        const rulesConfig = {
          businessRules: businessRules.filter(rule => rule.active),
          prioritySettings,
          configVersion: '1.0',
          generatedAt: new Date().toISOString()
        };
        const rulesJson = JSON.stringify(rulesConfig, null, 2);
        downloadFile(rulesJson, `rules-${timestamp}.json`, 'application/json');
      }
      
      setExportStatus('Export completed successfully!');
      setTimeout(() => setExportStatus(null), 3000);
      
    } catch (error) {
      setExportStatus('Export failed. Please try again.');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setIsExporting(false);
    }
  }, [data, businessRules, prioritySettings, exportConfig]);

  const getDataSummary = () => {
    const totalRows = data.clients.length + data.workers.length + data.tasks.length;
    return {
      totalRows,
      clients: data.clients.length,
      workers: data.workers.length,
      tasks: data.tasks.length,
      hasData: totalRows > 0
    };
  };

  const summary = getDataSummary();

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="flex items-center space-x-3 mb-6">
        <Download className="h-5 w-5 text-indigo-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
          <p className="text-sm text-gray-500">
            Download your cleaned data and configuration files
          </p>
        </div>
      </div>

      {!summary.hasData ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">No data to export</p>
          <p className="text-sm text-gray-400">Upload and process data files first</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{summary.totalRows}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.clients}</div>
              <div className="text-xs text-blue-600">Clients</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.workers}</div>
              <div className="text-xs text-green-600">Workers</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{summary.tasks}</div>
              <div className="text-xs text-purple-600">Tasks</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.value}
                    onClick={() => setExportConfig(prev => ({ ...prev, format: format.value as any }))}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all",
                      exportConfig.format === format.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={cn(
                        "h-5 w-5",
                        exportConfig.format === format.value ? "text-indigo-600" : "text-gray-400"
                      )} />
                      <span className="font-medium text-gray-900">{format.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportConfig.includeBusinessRules}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeBusinessRules: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-900">Include business rules & settings</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={exportData}
              disabled={isExporting}
              isLoading={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>

            {exportStatus && (
              <div className={cn(
                "mt-3 p-3 rounded-lg flex items-center space-x-2",
                exportStatus.includes('success') || exportStatus.includes('completed')
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              )}>
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{exportStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPanel; 