// Shared form primitives for the Agent Marketplace screens, matching the
// styling already established by app/components/skills/PublishSkillForm.tsx
// and app/components/enterprise/formPrimitives.tsx (same color tokens,
// input treatment, button styling) -- kept as its own small copy rather
// than a shared import, the same way PublishSkillForm's styling isn't
// factored out either.

import React from 'react';

export function inputClass(hasError?: boolean): string {
  return `w-full bg-[#0A0A0B] border ${hasError ? 'border-[#EF4444]' : 'border-[#262626]'} rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none transition-colors`;
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
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

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    APPROVED: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
    PENDING: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
    REJECTED: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
    SUSPENDED: 'bg-[#717171]/10 text-[#717171] border-[#717171]/20',
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
}
