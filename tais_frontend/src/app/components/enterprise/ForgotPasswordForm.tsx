import React, { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { enterpriseAuthApi } from '@/services/enterpriseAuthApi';
import { Field, inputClass, PrimaryButton, Card } from './formPrimitives';

export function ForgotPasswordForm({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await enterpriseAuthApi.forgotPassword(email);
      // The server intentionally always says this, whether or not the
      // email is registered, so this can't be used to enumerate accounts.
      setSent(true);
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-20 animate-in fade-in slide-in-from-bottom-4">
      <Card>
        <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mb-6">
          <KeyRound className="w-7 h-7 text-[#3B82F6]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tightest mb-2">Reset Password</h2>

        {sent ? (
          <p className="text-[#A1A1A1] text-sm leading-relaxed">
            If that email is registered, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <>
            <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8">
              Enter your email and we'll send you a link to reset your password.
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
              <div className="pt-2">
                <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send Reset Link'}</PrimaryButton>
              </div>
            </form>
          </>
        )}

        <button onClick={onBackToLogin} className="w-full text-center text-xs text-[#717171] hover:text-white mt-6 transition-colors">
          Back to sign in
        </button>
      </Card>
    </div>
  );
}

export default ForgotPasswordForm;
