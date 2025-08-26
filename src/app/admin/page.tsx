'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { AdminStats } from '@/components/admin/AdminStats';
import { ContentModerationQueue } from '@/components/admin/ContentModerationQueue';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemConfig } from '@/components/admin/SystemConfig';
import { Analytics } from '@/components/admin/Analytics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  BarChart3,
  Shield,
  Users,
  Settings,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

type AdminTab = 'overview' | 'moderation' | 'users' | 'config' | 'analytics';

export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || !user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();

        if (response.ok) {
          setIsAdmin(data.isAdmin);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-zinc-400">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-zinc-400">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'moderation', label: 'Moderation', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'config', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-zinc-400">Manage Stumble Higher platform</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Shield size={16} />
              <span>Admin: {user?.display_name || user?.username}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-brand text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && <AdminStats />}
            {activeTab === 'moderation' && <ContentModerationQueue />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'config' && <SystemConfig />}
            {activeTab === 'analytics' && <Analytics />}
          </div>
        </div>
      </div>
    </div>
  );
}
