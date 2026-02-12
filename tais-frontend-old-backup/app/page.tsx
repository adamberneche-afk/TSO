"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Sparkles, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Create Your Personal{" "}
            <span className="text-blue-500">AI Agent</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Answer a few questions, select verified skills, and deploy your custom agent in minutes. 
            No coding required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/interview">
              <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
                Start Interview
              </Button>
            </Link>
            <a 
              href="https://tso.onrender.com/api/skills" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
                Browse Skills
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-xl">1. Interview</CardTitle>
              <CardDescription className="text-gray-400">
                Answer 7-8 questions about your goals and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Our guided wizard discovers what you need
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle className="text-xl">2. Configure</CardTitle>
              <CardDescription className="text-gray-400">
                Select from verified skills in the registry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Each skill has a trust score and security audit
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle className="text-xl">3. Deploy</CardTitle>
              <CardDescription className="text-gray-400">
                Launch as Web, Desktop, or API agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Your agent runs where you want it
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Beta Notice */}
      <section className="container mx-auto px-4 py-12 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Public Beta</CardTitle>
              <CardDescription className="text-gray-400">
                Currently available for THINK Genesis Bundle holders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Limited to 10 uploads/day, 1MB file size during beta
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Input 
                  placeholder="Enter your email for updates" 
                  className="max-w-xs bg-gray-800 border-gray-700"
                />
                <Button onClick={() => alert('Coming soon!')}>Notify Me</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© 2026 TAIS Platform. Powered by THINK Protocol.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
