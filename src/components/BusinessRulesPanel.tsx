import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, Settings, Zap } from 'lucide-react';
import Button from './ui/Button';
import { BusinessRule, RuleCondition, RuleAction, DataType } from '@/types';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/utils';

interface BusinessRulesPanelProps {
  rules: BusinessRule[];
  onRulesChange: (rules: BusinessRule[]) => void;
  availableData: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  className?: string;
}

const BusinessRulesPanel: React.FC<BusinessRulesPanelProps> = ({
  rules,
  onRulesChange,
  availableData,
  className
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<Partial<BusinessRule>>({
    name: '',
    description: '',
    type: 'allocation',
    active: true,
    conditions: [],
    actions: [],
    priority: 5
  });

  const ruleTypes = [
    { value: 'allocation', label: 'Resource Allocation' },
    { value: 'constraint', label: 'Constraint' },
    { value: 'priority', label: 'Priority' },
    { value: 'dependency', label: 'Dependency' }
  ];

  const saveRule = useCallback(() => {
    if (!newRule.name || !newRule.description) return;

    const rule: BusinessRule = {
      id: generateId(),
      name: newRule.name,
      description: newRule.description,
      type: newRule.type || 'allocation',
      active: newRule.active !== false,
      conditions: newRule.conditions || [],
      actions: newRule.actions || [],
      priority: newRule.priority || 5
    };

    onRulesChange([...rules, rule]);
    setNewRule({
      name: '',
      description: '',
      type: 'allocation',
      active: true,
      conditions: [],
      actions: [],
      priority: 5
    });
    setIsCreating(false);
  }, [newRule, rules, onRulesChange]);

  const deleteRule = useCallback((ruleId: string) => {
    onRulesChange(rules.filter(r => r.id !== ruleId));
  }, [rules, onRulesChange]);

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'allocation': return '🎯';
      case 'constraint': return '🚫';
      case 'priority': return '⭐';
      case 'dependency': return '🔗';
      default: return '⚙️';
    }
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Business Rules</h3>
          <p className="text-sm text-gray-500">
            Create rules to control resource allocation and task assignment
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Create New Rule</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., High Priority Client First"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type
                </label>
                <select
                  value={newRule.type || 'allocation'}
                  onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select rule type"
                  title="Select rule type"
                >
                  {ruleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newRule.description || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="Describe what this rule does..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={saveRule}>
                <Save className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No business rules created yet</p>
            <p className="text-sm">Create rules to control how resources are allocated</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 border border-green-200 bg-green-50 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-lg">{getRuleTypeIcon(rule.type)}</span>
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BusinessRulesPanel; 