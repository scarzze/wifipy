import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Shield, Activity, LogOut, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Modal from '../components/common/Modal/Modal';
import styles from './AdminPage.module.scss';

// Mock admin service - replace with real implementation
const adminService = {
  login: async (username: string, password: string) => {
    // Mock login - replace with real API call
    if (username === 'admin' && password === 'password') {
      const token = 'mock-jwt-token';
      localStorage.setItem('admin_token', token);
      return { token, user: { username: 'admin', role: 'admin' } };
    }
    throw new Error('Invalid credentials');
  },
  
  getStats: async () => {
    return {
      sessions: { active: 12, total_today: 45 },
      payments: { pending: 3, confirmed_today: 42, total_revenue_today: 840 },
      system: { uptime: 86400, memory_usage: { rss: 50000000 } },
      security: { suspicious_activities: 2, blocked_ips: 5 }
    };
  },
  
  getSessions: async () => {
    return {
      sessions: [
        { reference: 'ABC123', mac: '00:11:22:33:44:55', ip: '192.168.1.100', createdAt: Date.now() - 1800000 },
        { reference: 'DEF456', mac: '00:11:22:33:44:66', ip: '192.168.1.101', createdAt: Date.now() - 3600000 }
      ],
      total: 2
    };
  },
  
  revokeSession: async (reference: string) => {
    console.log('Revoking session:', reference);
  }
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      const [statsData, sessionsData] = await Promise.all([
        adminService.getStats(),
        adminService.getSessions()
      ]);
      setStats(statsData);
      setSessions(sessionsData.sessions);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      await adminService.login(loginForm.username, loginForm.password);
      setIsAuthenticated(true);
      await loadData();
    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setStats(null);
    setSessions([]);
  };

  const handleRevokeSession = async (reference: string) => {
    try {
      await adminService.revokeSession(reference);
      setSessions(prev => prev.filter(s => s.reference !== reference));
      setSelectedSession(null);
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <Card className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <h1>Admin Login</h1>
            <p>Access the captive portal administration panel</p>
          </div>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                required
                placeholder="Enter username"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordInput}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className={styles.error}>
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              size="large"
              loading={loading}
              className={styles.loginButton}
            >
              Login
            </Button>
          </form>

          <div className={styles.loginHint}>
            <p>Demo credentials: admin / password</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <Button variant="secondary" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </Button>
      </div>

      {stats && (
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}>
              <Users size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Active Sessions</h3>
              <div className={styles.statValue}>{stats.sessions.active}</div>
              <div className={styles.statSubtext}>
                {stats.sessions.total_today} total today
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statIcon}>
              <DollarSign size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Revenue Today</h3>
              <div className={styles.statValue}>KES {stats.payments.total_revenue_today}</div>
              <div className={styles.statSubtext}>
                {stats.payments.confirmed_today} payments
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statIcon}>
              <Activity size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>System Status</h3>
              <div className={styles.statValue}>Online</div>
              <div className={styles.statSubtext}>
                Uptime: {formatUptime(stats.system.uptime)}
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statIcon}>
              <Shield size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>Security</h3>
              <div className={styles.statValue}>{stats.security.blocked_ips}</div>
              <div className={styles.statSubtext}>
                {stats.security.suspicious_activities} alerts
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className={styles.content}>
        <Card>
          <div className={styles.sectionHeader}>
            <h2>Active Sessions</h2>
            <Button variant="secondary" size="small" onClick={loadData}>
              Refresh
            </Button>
          </div>

          <div className={styles.sessionsTable}>
            <div className={styles.tableHeader}>
              <div>Reference</div>
              <div>Device</div>
              <div>IP Address</div>
              <div>Duration</div>
              <div>Actions</div>
            </div>

            {sessions.map((session) => (
              <div key={session.reference} className={styles.tableRow}>
                <div className={styles.reference}>{session.reference}</div>
                <div className={styles.device}>{session.mac || 'Unknown'}</div>
                <div className={styles.ip}>{session.ip}</div>
                <div className={styles.duration}>
                  {Math.round((Date.now() - session.createdAt) / 60000)}m
                </div>
                <div className={styles.actions}>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => setSelectedSession(session)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className={styles.emptyState}>
                <p>No active sessions</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Revoke Session"
      >
        {selectedSession && (
          <div className={styles.revokeModal}>
            <p>
              Are you sure you want to revoke internet access for session{' '}
              <strong>{selectedSession.reference}</strong>?
            </p>
            <p className={styles.warning}>
              This action cannot be undone and will immediately disconnect the user.
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="danger"
                onClick={() => handleRevokeSession(selectedSession.reference)}
              >
                Revoke Access
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedSession(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}