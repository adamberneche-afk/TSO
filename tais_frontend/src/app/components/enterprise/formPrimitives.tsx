// Shared form primitives for the Enterprise RAG screens, matching the
// styling already established by app/components/skills/PublishSkillForm.tsx
// (same color tokens, input treatment, button styling).

import React from 'react';

export function inputClass(hasError?: boolean): string {
  return `w-full bg-[#0A0A0B] border ${hasError ? 'border-[#EF4444]' : 'border-[#262626]'} rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none transition-colors`;
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-[#717171] font-bold mb-2">{label}</label>
      {children}
      {error && <p className="text-[#EF4444] text-xs mt-1">{error}</p>}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#141415] border border-[#262626] p-6 rounded-lg ${className}`}>{children}</div>;
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    OWNER: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
    ADMIN: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20',
    MEMBER: 'bg-[#262626] text-[#A1A1A1] border-[#333333]',
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${colors[role] || colors.MEMBER}`}>
      {role}
    </span>
  );
}
