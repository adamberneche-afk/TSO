// TAIS Platform - Skill Selector Component

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import registryClient from '../../../lib/registry-client';
import { Skill } from '../../../types/registry';
import { SelectedSkill } from '../../../types/agent';
import { Loader2, Search, Download, Shield } from 'lucide-react';

interface SkillSelectorProps {
  selectedGoals: string[];
  selectedSkills: SelectedSkill[];
  onSkillToggle: (skill: SelectedSkill) => void;
}

export function SkillSelector({
  selectedGoals,
  selectedSkills,
  onSkillToggle,
}: SkillSelectorProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  useEffect(() => {
    const fetchSkills = async () => {
      setLoading(true);
      try {
        const data = await registryClient.getSkills({
          category: selectedGoals[0],
        });
        setSkills(data.skills);
        // Check if we're using fallback data (console will show warning)
        setUsingFallbackData(data.skills.length > 0 && data.skills[0]?.skillHash?.startsWith('QmSkill'));
      } catch (error) {
        console.error('Failed to fetch skills:', error);
        setUsingFallbackData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [selectedGoals]);

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(filter.toLowerCase()) ||
      skill.description?.toLowerCase().includes(filter.toLowerCase())
  );

  const isSkillSelected = (skillId: string) => {
    return selectedSkills.some((s) => s.id === skillId);
  };

  const handleSkillClick = (skill: Skill) => {
    const selectedSkill: SelectedSkill = {
      id: skill.id,
      name: skill.name,
      version: skill.version,
      description: skill.description,
      skillHash: skill.skillHash,
      trustScore: skill.trustScore,
      permissions: skill.permissions,
      categories: skill.categories,
      downloadCount: skill.downloadCount,
    };
    onSkillToggle(selectedSkill);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555555]" />
        <Input
          placeholder="Search skills..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 bg-[#111111] border-[#333333] text-white placeholder:text-[#555555]"
        />
      </div>

      {selectedSkills.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">
            Selected Skills ({selectedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className="bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border border-[#3B82F6] cursor-pointer hover:bg-[rgba(59,130,246,0.2)]"
                onClick={() => handleSkillClick(skill as Skill)}
              >
                {skill.name}
                <button className="ml-2 hover:text-white">×</button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSkills.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-[#888888]">
            No skills found. Try adjusting your search.
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isSelected={isSkillSelected(skill.id)}
              onToggle={() => handleSkillClick(skill)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  onToggle: () => void;
}

function SkillCard({ skill, isSelected, onToggle }: SkillCardProps) {
  const trustScoreColor =
    skill.trustScore >= 0.8
      ? 'text-[#10B981]'
      : skill.trustScore >= 0.6
      ? 'text-[#F59E0B]'
      : 'text-[#EF4444]';

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-[#3B82F6] bg-[#1a1a1a] border-[#333333] ${
        isSelected ? 'border-[#3B82F6] ring-2 ring-[rgba(59,130,246,0.2)]' : ''
      }`}
      onClick={onToggle}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{skill.name}</h3>
              <Checkbox checked={isSelected} className="pointer-events-none" />
            </div>
            <p className="text-sm text-[#888888] line-clamp-2">
              {skill.description || 'No description available'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-[#888888]">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              v{skill.version}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {skill.downloadCount || 0}
            </span>
          </div>
          <div className={`font-medium ${trustScoreColor}`}>
            Trust: {Math.round(skill.trustScore * 100)}%
          </div>
        </div>

        {skill.categories && skill.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(skill.categories || []).slice(0, 2).map((cat) => (
              <Badge
                key={cat.id}
                variant="outline"
                className="text-xs border-[#333333] text-[#888888]"
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}