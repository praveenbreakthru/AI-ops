import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
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
import { DatabaseMonitoring } from './pages/DatabaseMonitoring';
import { SystemOverview } from './types';
import { api, MonitoredNode } from './services/api';

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => api.getStoredUser());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('aiops_theme') as 'dark' | 'light') || 'dark';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('aiops_sidebar_collapsed') === 'true';
  });

  const [currentTab, setCurrentTab] = useState('overview');
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [selectedNode, setSelectedNode] = useState<string>(() => api.getTargetNode());
  const [nodes, setNodes] = useState<MonitoredNode[]>([]);

  // Apply root & body theme classes
  useEffect(() => {
    document.documentElement.className = theme;
    document.body.className = theme;
    localStorage.setItem('aiops_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('aiops_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const fetchNodes = async () => {
    try {
      const data = await api.getNodes();
      if (Array.isArray(data)) {
        setNodes(data);
      }
    } catch (e) {
      console.error('Failed to fetch nodes:', e);
    }
  };

  const fetchOverview = useCallback(async (target = selectedNode) => {
    setIsRefreshing(true);
    try {
      const data = await api.getOverview(target);
      setOverview(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to fetch system overview:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedNode]);

  const handleNodeChange = (nodeId: string) => {
    api.setTargetNode(nodeId);
    setSelectedNode(nodeId);
    fetchOverview(nodeId);
  };

  useEffect(() => {
    if (currentUser) {
      fetchNodes();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchOverview(selectedNode);
    }
  }, [selectedNode, fetchOverview, currentUser]);

  useEffect(() => {
    if (!currentUser || refreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchOverview(selectedNode);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, selectedNode, fetchOverview, currentUser]);

  // If user is not logged in, present Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview overview={overview} />;
      case 'apps_containers':
        return <AppsContainersPage />;
      case 'databases':
        return <DatabaseMonitoring />;
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
    <div className={`flex min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#090c15] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeAlerts={overview?.active_alerts_count || 0}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        theme={theme}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar
          lastUpdated={lastUpdated}
          onRefresh={() => fetchOverview(selectedNode)}
          isRefreshing={isRefreshing}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          status={overview?.status || 'healthy'}
          selectedNode={selectedNode}
          onNodeChange={handleNodeChange}
          nodes={nodes}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={(tabId: string) => setCurrentTab(tabId)}
          onRefreshNodes={fetchNodes}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div key={`${selectedNode}-${currentTab}`} className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
