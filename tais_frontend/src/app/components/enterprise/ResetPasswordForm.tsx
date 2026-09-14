import React, { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { enterpriseAuthApi } from '@/services/enterpriseAuthApi';
import { Field, inputClass, PrimaryButton, Card } from './formPrimitives';

export function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await enterpriseAuthApi.resetPassword(token, newPassword);
      setDone(true);
      toast.success('Password updated');
    } catch (err: any) {
      setError(err?.message || 'This reset link is invalid or has expired');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-20 animate-in fade-in slide-in-from-bottom-4">
      <Card>
        <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mb-6">
          {done ? <CheckCircle2 className="w-7 h-7 text-[#10B981]" /> : <KeyRound className="w-7 h-7 text-[#3B82F6]" />}
        </div>
        <h2 className="text-2xl font-bold tracking-tightest mb-2">
          {done ? 'Password updated' : 'Set a new password'}
        </h2>

        {done ? (
          <>
            <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8">You can now sign in with your new password.</p>
            <PrimaryButton onClick={onDone} type="button">
              Go to sign in
            </PrimaryButton>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="New password" error={error || undefined}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={inputClass(!!error)}
                required
              />
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={inputClass()}
                required
              />
            </Field>
            <div className="pt-2">
              <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Password'}</PrimaryButton>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export default ResetPasswordForm;
