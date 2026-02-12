// TAIS Platform - Utility Functions

import { AgentConfig } from '../types/agent';

/**
 * Format a wallet address for display (shortened)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Download a JSON file
 */
export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Format a date/time string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date/time with time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get config file size in KB
 */
export function getConfigSize(config: AgentConfig): string {
  const json = JSON.stringify(config);
  const bytes = new Blob([json]).size;
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

/**
 * Calculate interview completion percentage
 */
export function calculateCompletionPercentage(currentStep: number, totalSteps: number): number {
  return Math.round((currentStep / totalSteps) * 100);
}

/**
 * Generate a shareable link for an agent config
 */
export function generateShareLink(config: AgentConfig): string {
  const encoded = btoa(JSON.stringify(config));
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/agent/${config.agent.name}?config=${encoded}`;
}

/**
 * Parse a shareable link to get config
 */
export function parseShareLink(url: string): AgentConfig | null {
  try {
    const urlObj = new URL(url);
    const configParam = urlObj.searchParams.get('config');
    if (!configParam) return null;
    
    const decoded = atob(configParam);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse share link:', error);
    return null;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get trust score color class
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 0.8) return 'text-[#10B981]';
  if (score >= 0.6) return 'text-[#F59E0B]';
  return 'text-[#EF4444]';
}

/**
 * Get trust score label
 */
export function getTrustScoreLabel(score: number): string {
  if (score >= 0.8) return 'High Trust';
  if (score >= 0.6) return 'Medium Trust';
  return 'Low Trust';
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
