import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - TAIS",
  description: "Terms of Service for TAIS - Think Agent Interview System",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/" 
            className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mt-8 mb-4">Terms of Service</h1>
          <p className="text-[var(--text-secondary)]">Last updated: February 11, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              By accessing or using TAIS (Think Agent Interview System), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              TAIS is a configuration-first agent builder that allows users to create AI agents through a structured interview process. 
              The service includes:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>AI agent configuration generation</li>
              <li>Skill registry browsing and selection</li>
              <li>Wallet connection for NFT ownership (optional)</li>
              <li>JSON configuration export</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Wallet Connection</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              TAIS allows optional wallet connection via MetaMask or compatible Web3 wallets. Connecting a wallet is not required 
              to use the basic features of the service. When you connect a wallet:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>We only read your wallet address for identification purposes</li>
              <li>We never request private keys or seed phrases</li>
              <li>Genesis NFT holders may access additional features</li>
              <li>You maintain full control of your wallet at all times</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The AI agent configurations you create using TAIS are your property. You are free to use, modify, and distribute 
              these configurations as you see fit. TAIS does not claim ownership over user-generated agent configurations.
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              The TAIS platform, including its code, design, and branding, is the property of the THINK ecosystem and is 
              protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              You agree not to use TAIS to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Create agents for illegal or harmful purposes</li>
              <li>Attempt to compromise the security of the platform</li>
              <li>Upload malicious code or content</li>
              <li>Interfere with other users&apos; access to the service</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Disclaimer of Warranties</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              TAIS is provided &quot;as is&quot; without any warranties, express or implied. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>The service will be uninterrupted or error-free</li>
              <li>Agent configurations will meet your specific requirements</li>
              <li>Skills from the registry are safe or appropriate for your use case</li>
              <li>Wallet connections will always be successful</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              To the maximum extent permitted by law, TAIS and its contributors shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon 
              posting to this page. Your continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              For questions about these Terms of Service, please contact us through the THINK community channels or 
              create an issue on our GitHub repository.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[var(--border-default)]">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--text-muted)]">
              © 2026 TAIS - Think Agent Interview System
            </p>
            <Link 
              href="/privacy"
              className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
