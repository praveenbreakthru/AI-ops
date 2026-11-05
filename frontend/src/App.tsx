import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { CpuMonitoring } from './pages/CpuMonitoring';
import { MemoryMonitoring } from './pages/MemoryMonitoring';
import { DiskMonitoring } from './pages/DiskMonitoring';
import { NetworkMonitoring } from './pages/NetworkMonitoring';
import { ProcessMonitoring } from './pages/ProcessMonitoring';
import { ServicesMonitoring } from './pages/ServicesMonitoring';
import { LogsExplorer } from './pages/LogsExplorer';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AiInsights } from './pages/AiInsights';
import { PredictionsPage } from './pages/PredictionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppsContainersPage } from './pages/AppsContainersPage';
import { SystemOverview } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10);

  const fetchOverview = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getOverview();
      setOverview(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to fetch system overview:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchOverview();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview overview={overview} />;
      case 'apps_containers':
        return <AppsContainersPage />;
      case 'cpu':
        return <CpuMonitoring />;
      case 'memory':
        return <MemoryMonitoring />;
      case 'disk':
        return <DiskMonitoring />;
      case 'network':
        return <NetworkMonitoring />;
      case 'processes':
        return <ProcessMonitoring />;
      case 'services':
        return <ServicesMonitoring />;
      case 'logs':
        return <LogsExplorer />;
      case 'alerts':
        return <AlertsPage />;
      case 'incidents':
        return <IncidentsPage />;
      case 'ai_insights':
        return <AiInsights />;
      case 'predictions':
        return <PredictionsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Overview overview={overview} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeAlerts={overview?.active_alerts_count || 0}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          lastUpdated={lastUpdated}
          onRefresh={fetchOverview}
          isRefreshing={isRefreshing}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          status={overview?.status || 'healthy'}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

