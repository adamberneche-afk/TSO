import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - TAIS",
  description: "Privacy Policy for TAIS - Think Agent Interview System",
};

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold mt-8 mb-4">Privacy Policy</h1>
          <p className="text-[var(--text-secondary)]">Last updated: February 11, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              TAIS (Think Agent Interview System) is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, and safeguard your information when you use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Information You Provide</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              When using TAIS, you may provide:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Agent names and descriptions</li>
              <li>Configuration preferences (goals, personality settings, privacy levels)</li>
              <li>Selected skills from the registry</li>
              <li>Wallet address (if you choose to connect a wallet)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Information Collected Automatically</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              We automatically collect certain information:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>IP address (anonymized)</li>
              <li>Usage patterns and feature interactions</li>
              <li>Error logs and performance data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Generate AI agent configurations based on your inputs</li>
              <li>Provide and improve the TAIS service</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Detect and prevent security issues</li>
              <li>Communicate updates or changes to the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Wallet Connection and Blockchain Data</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              When you connect a wallet (optional):
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>We only store your public wallet address</li>
              <li>We never have access to your private keys or seed phrases</li>
              <li>We may verify NFT ownership to enable Genesis holder features</li>
              <li>Blockchain transactions are public by nature</li>
              <li>You can disconnect your wallet at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Storage and Security</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              <strong>Local Storage:</strong> Agent configurations and interview progress are stored locally in your browser 
              using localStorage. This data never leaves your device unless you explicitly export it.
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              <strong>Server Data:</strong> When you interact with our skill registry API, we log anonymized request data 
              for performance monitoring and security purposes.
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              <strong>Security Measures:</strong> We implement industry-standard security measures including HTTPS encryption, 
              input validation, and regular security audits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li><strong>Vercel:</strong> Hosting and analytics</li>
              <li><strong>Sentry:</strong> Error tracking and performance monitoring</li>
              <li><strong>Render:</strong> Skill registry API hosting</li>
              <li><strong>Ethereum RPC Providers:</strong> For wallet connections and NFT verification</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We use minimal cookies and tracking:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li><strong>Essential:</strong> LocalStorage for saving interview progress</li>
              <li><strong>Analytics:</strong> Vercel Analytics for usage statistics (anonymized)</li>
              <li><strong>Error Tracking:</strong> Sentry for error monitoring</li>
            </ul>
            <p className="text-[var(--text-secondary)] mt-4">
              We do not use advertising cookies or trackers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Access the data we have about you</li>
              <li>Delete your local data by clearing browser storage</li>
              <li>Disconnect your wallet at any time</li>
              <li>Export your agent configurations</li>
              <li>Opt-out of analytics (contact us)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              TAIS is not intended for children under 13 years of age. We do not knowingly collect personal information 
              from children under 13. If you are a parent or guardian and believe your child has provided us with 
              personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
              new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              If you have any questions about this Privacy Policy, please:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Create an issue on our GitHub repository</li>
              <li>Reach out through the THINK community channels</li>
              <li>Contact the THINK team through official channels</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Open Source</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              TAIS is an open-source project. You can inspect our code, suggest improvements, and contribute to the 
              project on GitHub. We believe in transparency and community-driven development.
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
              href="/terms"
              className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
