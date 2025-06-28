import React, { useState, useCallback } from 'react';
import { Sliders, RotateCcw, Save } from 'lucide-react';
import Button from './ui/Button';
import { PrioritySettings } from '@/types';
import { cn } from '@/lib/utils';

interface PriorityPanelProps {
  settings: PrioritySettings;
  onSettingsChange: (settings: PrioritySettings) => void;
  className?: string;
}

const PriorityPanel: React.FC<PriorityPanelProps> = ({
  settings,
  onSettingsChange,
  className
}) => {
  const [localSettings, setLocalSettings] = useState<PrioritySettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const priorityFactors = [
    {
      key: 'clientPriorityWeight' as keyof PrioritySettings,
      label: 'Client Priority',
      description: 'Prioritize high-priority clients first',
      icon: '👥'
    },
    {
      key: 'skillMatchWeight' as keyof PrioritySettings,
      label: 'Skill Match',
      description: 'Prefer workers with exact skill matches',
      icon: '🎯'
    },
    {
      key: 'workloadBalanceWeight' as keyof PrioritySettings,
      label: 'Workload Balance',
      description: 'Distribute work evenly among workers',
      icon: '⚖️'
    },
    {
      key: 'deadlineWeight' as keyof PrioritySettings,
      label: 'Deadline Urgency',
      description: 'Prioritize tasks with closer deadlines',
      icon: '⏰'
    },
    {
      key: 'costOptimizationWeight' as keyof PrioritySettings,
      label: 'Cost Optimization',
      description: 'Optimize for lower cost assignments',
      icon: '💰'
    }
  ];

  const updateSetting = useCallback((key: keyof PrioritySettings, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const saveSettings = useCallback(() => {
    onSettingsChange(localSettings);
    setHasChanges(false);
  }, [localSettings, onSettingsChange]);

  const resetToDefaults = useCallback(() => {
    const defaultSettings: PrioritySettings = {
      clientPriorityWeight: 30,
      skillMatchWeight: 25,
      workloadBalanceWeight: 20,
      deadlineWeight: 15,
      costOptimizationWeight: 10
    };
    setLocalSettings(defaultSettings);
    setHasChanges(true);
  }, []);

  const getTotalWeight = () => {
    return Object.values(localSettings).reduce((sum, value) => sum + value, 0);
  };

  const isValidTotal = () => {
    const total = getTotalWeight();
    return total >= 95 && total <= 105;
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Sliders className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Priority Settings</h3>
            <p className="text-sm text-gray-500">
              Adjust the relative importance of different factors in resource allocation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          {hasChanges && (
            <Button onClick={saveSettings} disabled={!isValidTotal()}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        "mb-6 p-3 rounded-lg border",
        isValidTotal() 
          ? "border-green-200 bg-green-50" 
          : "border-red-200 bg-red-50"
      )}>
        <span className={cn(
          "text-sm font-medium",
          isValidTotal() ? "text-green-800" : "text-red-800"
        )}>
          Total Weight: {getTotalWeight()}%
        </span>
      </div>

      <div className="space-y-6">
        {priorityFactors.map((factor) => {
          const value = localSettings[factor.key];
          return (
            <div key={factor.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{factor.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{factor.label}</h4>
                    <p className="text-sm text-gray-500">{factor.description}</p>
                  </div>
                </div>
                <span className="text-lg font-semibold text-gray-900">{value}%</span>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500">0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => updateSetting(factor.key, parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  aria-label={`${factor.label} weight`}
                  title={`Set ${factor.label} weight`}
                />
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityPanel; 