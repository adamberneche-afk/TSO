// Enterprise RAG: email/password login (docs/ENTERPRISE_RAG_IDENTITY.md).
// No wallet connect button anywhere on this screen -- that's the point.

import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useEnterpriseAuth } from '@/hooks/useEnterpriseAuth';
import { Field, inputClass, PrimaryButton, Card } from './formPrimitives';

export function EnterpriseLogin({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { login, isLoggingIn, error } = useEnterpriseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="max-w-md mx-auto my-20 animate-in fade-in slide-in-from-bottom-4">
      <Card>
        <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mb-6">
          <Building2 className="w-7 h-7 text-[#3B82F6]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tightest mb-2">Enterprise Sign In</h2>
        <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8">
          Sign in to your organization's shared knowledge base. No wallet required -- your
          organization admin invited you by email.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              className={inputClass()}
              required
            />
          </Field>
          <Field label="Password" error={error || undefined}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={inputClass(!!error)}
              required
            />
          </Field>

          <div className="pt-2">
            <PrimaryButton disabled={isLoggingIn}>{isLoggingIn ? 'Signing in...' : 'Sign In'}</PrimaryButton>
          </div>
        </form>

        <button
          onClick={onForgotPassword}
          className="w-full text-center text-xs text-[#717171] hover:text-white mt-4 transition-colors"
        >
          Forgot your password?
        </button>
      </Card>

      <p className="text-center text-xs text-[#717171] mt-6">
        Don't have an account yet? Ask your organization admin for an invitation.
      </p>
    </div>
  );
}

export default EnterpriseLogin;
