import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Database, Cpu, MemoryStick, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../api/client';

interface DashboardData {
  timestamp: string;
  health: {
    database: boolean;
    system: {
      status: string;
      uptime: number;
      load: number[];
    };
    overall: 'healthy' | 'degraded' | 'down';
  };
  performance: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: NodeJS.CpuUsage;
    uptime: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
  };
}

export function MonitoringDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboard = async () => {
    try {
      const json = await api.get<DashboardData>('/monitoring/dashboard');
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-[#4ADE80]';
      case 'degraded': return 'text-[#F59E0B]';
      default: return 'text-[#EF4444]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-400">{error}</p>
        <button 
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Monitoring</h2>
          <p className="text-sm text-[#717171] uppercase tracking-widest mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 hover:bg-[#252525] rounded-lg transition-colors text-[#888888] hover:text-white"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${
        data?.health.overall === 'healthy' 
          ? 'bg-[#4ADE80]/10 border-[#4ADE80]/20' 
          : 'bg-[#F59E0B]/10 border-[#F59E0B]/20'
      }`}>
        <div className="flex items-center gap-3">
          <Activity className={`w-6 h-6 ${getStatusColor(data?.health.overall || '')}`} />
          <div>
            <h3 className={`font-bold ${getStatusColor(data?.health.overall || '')}`}>
              System {data?.health.overall?.toUpperCase() || 'UNKNOWN'}
            </h3>
            <p className="text-xs text-[#717171] uppercase tracking-widest">
              Uptime: {data ? formatUptime(data.performance.uptime) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database */}
        <Card className="bg-[#141415] border-[#262626] p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className={`w-5 h-5 ${data?.health.database ? 'text-[#4ADE80]' : 'text-[#EF4444]'}`} />
            <span className="text-xs text-[#717171] uppercase tracking-widest">Database</span>
          </div>
          <p className={`text-lg font-bold ${data?.health.database ? 'text-[#4ADE80]' : 'text-[#EF4444]'}`}>
            {data?.health.database ? 'Connected' : 'Disconnected'}
          </p>
        </Card>

        {/* Memory */}
        <Card className="bg-[#141415] border-[#262626] p-4">
          <div className="flex items-center gap-3 mb-3">
            <MemoryStick className="w-5 h-5 text-[#3B82F6]" />
            <span className="text-xs text-[#717171] uppercase tracking-widest">Memory</span>
          </div>
          <p className="text-lg font-bold text-white">
            {data?.performance.memory.used} MB
          </p>
          <p className="text-xs text-[#717171]">
            {data?.performance.memory.percentage}% of {data?.performance.memory.total} MB
          </p>
        </Card>

        {/* CPU */}
        <Card className="bg-[#141415] border-[#262626] p-4">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-5 h-5 text-[#8B5CF6]" />
            <span className="text-xs text-[#717171] uppercase tracking-widest">CPU</span>
          </div>
          <p className="text-lg font-bold text-white">
            Active
          </p>
          <p className="text-xs text-[#717171]">
            Load: {data?.health.system.load.map(l => l.toFixed(2)).join(', ')}
          </p>
        </Card>

        {/* Alerts */}
        <Card className="bg-[#141415] border-[#262626] p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className={`w-5 h-5 ${data?.alerts.active ? 'text-[#F59E0B]' : 'text-[#717171]'}`} />
            <span className="text-xs text-[#717171] uppercase tracking-widest">Alerts</span>
          </div>
          <p className="text-lg font-bold text-white">
            {data?.alerts.active || 0} Active
          </p>
          <div className="flex gap-2 mt-1">
            {data?.alerts.critical ? (
              <Badge className="bg-[#EF4444]/20 text-[#EF4444] text-[8px]">
                {data.alerts.critical} Critical
              </Badge>
            ) : null}
            {data?.alerts.warning ? (
              <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] text-[8px]">
                {data.alerts.warning} Warning
              </Badge>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Prometheus Metrics Link */}
      <Card className="bg-[#141415] border-[#262626] p-4">
        <h3 className="text-xs text-[#717171] uppercase tracking-widest mb-3">Prometheus Metrics</h3>
        <a 
          href={`${REGISTRY_URL}/monitoring/metrics`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3B82F6] hover:underline text-sm font-mono"
        >
          {`${REGISTRY_URL}/monitoring/metrics`}
        </a>
        <p className="text-xs text-[#717171] mt-2">
          Scrape this endpoint with Prometheus to collect metrics
        </p>
      </Card>

      {/* Timestamp */}
      <p className="text-xs text-[#666666] text-center uppercase tracking-widest">
        Server Time: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
      </p>
    </div>
  );
}
