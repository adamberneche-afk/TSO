// TAIS Platform - Step 4: Privacy & Constraints

import React from 'react';
import { Slider } from '../ui/slider';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Shield, Server, Cloud, DollarSign } from 'lucide-react';

interface PrivacyStepProps {
  privacy: 'local' | 'balanced' | 'cloud';
  maxCost: number;
  permissions: string[];
  onPrivacyChange: (value: 'local' | 'balanced' | 'cloud') => void;
  onMaxCostChange: (value: number) => void;
  onPermissionsChange: (permissions: string[]) => void;
}

const PERMISSION_OPTIONS = [
  {
    id: 'network',
    label: 'Network Requests',
    description: 'Allow agent to make HTTP/HTTPS requests',
    icon: Cloud,
  },
  {
    id: 'filesystem',
    label: 'File System Access',
    description: 'Read and write files on your device',
    icon: Server,
  },
  {
    id: 'api',
    label: 'External API Calls',
    description: 'Connect to third-party services and APIs',
    icon: Server,
  },
  {
    id: 'code',
    label: 'Code Execution',
    description: 'Execute code in a sandboxed environment',
    icon: Shield,
  },
];

export function PrivacyStep({
  privacy,
  maxCost,
  permissions,
  onPrivacyChange,
  onMaxCostChange,
  onPermissionsChange,
}: PrivacyStepProps) {
  const togglePermission = (permissionId: string) => {
    if (permissions.includes(permissionId)) {
      onPermissionsChange(permissions.filter((p) => p !== permissionId));
    } else {
      onPermissionsChange([...permissions, permissionId]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">Privacy & Constraints</h2>
        <p className="text-[#888888]">
          Set boundaries and security preferences for your agent
        </p>
      </div>

      {/* Privacy Preference */}
      <div className="space-y-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#3B82F6]" />
          <Label className="text-base text-white">Privacy Preference</Label>
        </div>
        <p className="text-sm text-[#888888]">
          Choose where your agent's data is processed and stored
        </p>

        <RadioGroup value={privacy} onValueChange={onPrivacyChange}>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer">
              <RadioGroupItem value="local" id="local" />
              <div className="flex-1">
                <Label htmlFor="local" className="cursor-pointer text-white font-medium">
                  Maximum Privacy (Local-First)
                </Label>
                <p className="text-sm text-[#888888] mt-1">
                  All processing happens on your device. No data sent to external servers.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer">
              <RadioGroupItem value="balanced" id="balanced" />
              <div className="flex-1">
                <Label htmlFor="balanced" className="cursor-pointer text-white font-medium">
                  Balanced
                </Label>
                <p className="text-sm text-[#888888] mt-1">
                  Sensitive data stays local, non-sensitive data can use cloud processing for better performance.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer">
              <RadioGroupItem value="cloud" id="cloud" />
              <div className="flex-1">
                <Label htmlFor="cloud" className="cursor-pointer text-white font-medium">
                  Convenience-First
                </Label>
                <p className="text-sm text-[#888888] mt-1">
                  Prioritize performance and features. Data may be processed in the cloud.
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Budget Per Action */}
      <div className="space-y-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#3B82F6]" />
            <Label className="text-base text-white">Budget Per Action</Label>
          </div>
          <span className="text-lg font-medium text-[#3B82F6]">
            ${maxCost.toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-[#888888]">
          Maximum cost per individual agent action (API calls, computations, etc.)
        </p>
        <div className="space-y-2">
          <Slider
            value={[maxCost * 100]}
            onValueChange={([value]) => onMaxCostChange(value / 100)}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[#888888]">
            <span>$0.01</span>
            <span>$1.00</span>
          </div>
        </div>
        <p className="text-xs text-[#888888]">
          Your agent will notify you if an action exceeds this limit
        </p>
      </div>

      {/* Allowed Capabilities */}
      <div className="space-y-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <Label className="text-base text-white">Allowed Capabilities</Label>
        <p className="text-sm text-[#888888]">
          Select which capabilities your agent can use
        </p>

        <div className="space-y-3">
          {PERMISSION_OPTIONS.map((permission) => {
            const Icon = permission.icon;
            const isChecked = permissions.includes(permission.id);

            return (
              <div
                key={permission.id}
                className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer"
                onClick={() => togglePermission(permission.id)}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => togglePermission(permission.id)}
                  className="mt-1"
                />
                <Icon className="w-5 h-5 text-[#888888] mt-0.5" />
                <div className="flex-1">
                  <Label className="cursor-pointer text-white font-medium">
                    {permission.label}
                  </Label>
                  <p className="text-sm text-[#888888] mt-1">
                    {permission.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
