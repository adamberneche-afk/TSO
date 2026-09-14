// Enterprise RAG entry point (docs/ENTERPRISE_RAG_IDENTITY.md). Reached
// from the landing page's "Enterprise" tile, or directly if a session is
// already active. Shows sign-in (email/password, no wallet) or the org
// dashboard depending on whether a session already exists, and always
// offers the separate, wallet-gated "provision a new organization" panel
// for platform admins alongside it.

import React, { useState } from 'react';
import { authApi } from '@/services/authApi';
import { EnterpriseLogin } from './EnterpriseLogin';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { OrgDashboard } from './OrgDashboard';
import { CreateOrganizationForm } from './CreateOrganizationForm';

type Mode = 'login' | 'forgot-password';

export function EnterprisePage() {
  const [mode, setMode] = useState<Mode>('login');
  // Re-checked on every render rather than cached in state: the simplest
  // way to reflect a fresh login/logout immediately without wiring a
  // separate global auth-changed event.
  const hasSession = authApi.hasValidSession();

  if (hasSession) {
    return (
      <div>
        <OrgDashboard />
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <details className="mt-6">
            <summary className="text-xs text-[#717171] hover:text-white cursor-pointer transition-colors">
              Platform admin: provision a new organization
            </summary>
            <div className="mt-4 max-w-md">
              <CreateOrganizationForm />
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6">
      {mode === 'login' ? (
        <EnterpriseLogin onForgotPassword={() => setMode('forgot-password')} />
      ) : (
        <ForgotPasswordForm onBackToLogin={() => setMode('login')} />
      )}

      <details className="max-w-md mx-auto mb-12">
        <summary className="text-xs text-[#717171] hover:text-white cursor-pointer transition-colors text-center">
          Platform admin: provision a new organization
        </summary>
        <div className="mt-4">
          <CreateOrganizationForm />
        </div>
      </details>
    </div>
  );
}

export default EnterprisePage;
