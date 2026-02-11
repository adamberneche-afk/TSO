import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-6xl">
            Create Your Personal
            <span className="text-[var(--accent-primary)]"> AI Agent</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-[var(--text-secondary)]">
            Answer a few questions, select verified skills, and deploy your custom agent in minutes. 
            No coding required.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg">Start Interview</Button>
            <Button variant="secondary" size="lg">Browse Skills</Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-[var(--text-primary)]">
            How It Works
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>1. Interview</CardTitle>
                <CardDescription>
                  Answer 7-8 questions about your goals and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-muted)]">
                  Our guided wizard discovers what you need
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Configure</CardTitle>
                <CardDescription>
                  Select from verified skills in the registry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-muted)]">
                  Each skill has a trust score and security audit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Deploy</CardTitle>
                <CardDescription>
                  Launch as Web, Desktop, or API agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-muted)]">
                  Your agent runs where you want it
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Beta Notice */}
      <section className="px-4 py-12 border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl text-center">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Public Beta</CardTitle>
              <CardDescription>
                Currently available for THINK Genesis Bundle holders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Limited to 10 uploads/day, 1MB file size during beta
              </p>
              <div className="flex gap-4 justify-center">
                <Input 
                  placeholder="Enter your email for updates" 
                  className="max-w-xs"
                />
                <Button>Notify Me</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[var(--text-muted)]">
          <p>© 2026 TAIS Platform. Powered by THINK Protocol.</p>
          <div className="flex gap-6">
            <Link 
              href="/terms" 
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              href="/privacy" 
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
