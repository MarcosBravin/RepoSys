import React, { useEffect, useMemo, useState } from 'react';
import { Box, Toolbar, Snackbar, Alert, LinearProgress, useMediaQuery } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { io } from 'socket.io-client';
import { createAppTheme } from './theme/theme';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Tabela from './pages/Tabela';
import Agenda from './pages/Agenda';
import Login from './pages/Login';
import Users from './pages/Users';
import Notes from './pages/Notes';
import {
  api,
  BACKEND_URL,
  authStorage,
  canDeleteReposicoes,
  canManageReposicoes,
  canManageUsers,
  getErrorMessage,
} from './services/api';

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 84;
const THEME_STORAGE_KEY = 'reposys:theme-mode';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState(null);
  const [notesRealtimeEvent, setNotesRealtimeEvent] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'system');
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [pwaInstalled, setPwaInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const showToast = (message, severity = 'info') => {
    setToast({ open: true, message, severity });
  };

  const resolvedThemeMode = themeMode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : themeMode;
  const theme = useMemo(() => createAppTheme(resolvedThemeMode), [resolvedThemeMode]);
  const isDesktopNav = useMediaQuery(theme.breakpoints.up('lg'));
  const activeSidebarWidth = isDesktopNav ? (sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH) : DRAWER_WIDTH;

  const refreshPendingItems = async () => {
    try {
      const pendingData = await api.getAll({ status: 'PENDENTE' });
      setPendingItems(pendingData);
    } catch (_error) {
      // no-op
    }
  };

  const loadBaseData = async () => {
    const [statsData, activityData, pendingData] = await Promise.all([
      api.getStats(),
      api.getActivity(),
      api.getAll({ status: 'PENDENTE' }),
    ]);
    setStats(statsData);
    setActivityFeed(activityData);
    setPendingItems(pendingData);
  };

  const logout = (message) => {
    api.logout().catch(() => {});
    authStorage.clear();
    setUser(null);
    setStats(null);
    setActivityFeed([]);
    setPendingItems([]);
    setRealtimeUpdates(null);
    setNotesRealtimeEvent(null);
    setConnected(false);
    setPage('dashboard');
    setMobileNavOpen(false);
    if (message) showToast(message, 'info');
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = authStorage.getToken();
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const currentUser = await api.me();
        setUser(currentUser);
        await loadBaseData();
      } catch (error) {
        logout('Sua sessão expirou. Faça login novamente.');
      } finally {
        setBooting(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const handleAppInstalled = () => {
      setPwaInstalled(true);
      setInstallPromptEvent(null);
      showToast('Aplicativo instalado com sucesso.', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const token = authStorage.getToken();
    const socket = io(BACKEND_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('activity', (entry) => {
      setActivityFeed((prev) => [entry, ...prev].slice(0, 50));
    });

    const refreshStats = () => {
      api.getStats().then(setStats).catch(() => {});
      refreshPendingItems();
    };

    socket.on('reposicao:updated', (data) => {
      setRealtimeUpdates({ type: 'updated', data });
      refreshStats();
    });

    socket.on('reposicao:created', (data) => {
      setRealtimeUpdates({ type: 'created', data });
      refreshStats();
    });

    socket.on('reposicao:deleted', (data) => {
      setRealtimeUpdates({ type: 'deleted', data });
      refreshStats();
    });

    socket.on('note:created', (data) => {
      setNotesRealtimeEvent({ type: 'created', data, at: Date.now() });
    });

    socket.on('note:updated', (data) => {
      setNotesRealtimeEvent({ type: 'updated', data, at: Date.now() });
    });

    socket.on('note:deleted', (data) => {
      setNotesRealtimeEvent({ type: 'deleted', data, at: Date.now() });
    });

    socket.on('connect_error', (error) => {
      console.error('Falha na conexão em tempo real', error.message);
      setConnected(false);
    });

    return () => socket.disconnect();
  }, [user]);

  const handleLogin = async (credentials) => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const response = await api.login(credentials);
      authStorage.setToken(response.token);
      authStorage.setRefreshToken(response.refreshToken);
      setUser(response.user);
      await loadBaseData();
      showToast(`Bem-vindo, ${response.user.nome}`, 'success');
    } catch (error) {
      setLoginError(getErrorMessage(error, 'Não foi possível entrar no sistema.'));
    } finally {
      setLoggingIn(false);
      setBooting(false);
    }
  };

  const handleThemeModeChange = (nextMode) => {
    setThemeMode(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) {
      showToast('A instalação não está disponível neste navegador no momento.', 'info');
      return;
    }

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallPromptEvent(null);
    }
  };

  const handleNavigate = (nextPage) => {
    setPage(nextPage);
    setMobileNavOpen(false);
  };

  const permissions = useMemo(() => {
    const role = user?.role;
    return {
      canManageReposicoes: canManageReposicoes(role),
      canDeleteReposicoes: canDeleteReposicoes(role),
      canManageUsers: canManageUsers(role),
    };
  }, [user]);

  if (booting) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 4 }}>
          <Box sx={{ width: '100%', maxWidth: 320 }}>
            <LinearProgress />
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onSubmit={handleLogin} loading={loggingIn} error={loginError} />
      </ThemeProvider>
    );
  }

  const pendingCount = stats?.pendentes || 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Sidebar
          currentPage={page}
          onNavigate={handleNavigate}
          stats={stats}
          user={user}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onLogout={() => logout('Sessão encerrada.')}
          collapsed={sidebarCollapsed}
          drawerWidth={DRAWER_WIDTH}
          collapsedWidth={COLLAPSED_DRAWER_WIDTH}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        />

        <Box sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
        }}>
          <Header
            onSearch={setSearch}
            searchValue={search}
            connected={connected}
            pendingCount={pendingCount}
            pendingItems={pendingItems}
            user={user}
            themeMode={themeMode}
            onThemeModeChange={handleThemeModeChange}
            canInstallPwa={!pwaInstalled && Boolean(installPromptEvent)}
            onInstallPwa={handleInstallApp}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            showMenuButton={!isDesktopNav}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
            sidebarCollapsed={sidebarCollapsed}
            sidebarWidth={activeSidebarWidth}
            onLogout={() => logout('Sessão encerrada.')}
          />
          <Toolbar sx={{ minHeight: { xs: '120px !important', sm: '68px !important' } }} />

          <Box
            component="main"
            sx={{
              flex: 1,
              px: { xs: 1.5, sm: 2.5, md: 3 },
              pb: { xs: 2, sm: 3 },
              width: '100%',
              boxSizing: 'border-box',
            }}>
            {page === 'dashboard' && (
              <Dashboard stats={stats} activityFeed={activityFeed} />
            )}
            {page === 'tabela' && (
              <Tabela
                searchValue={search}
                realtimeUpdates={realtimeUpdates}
                permissions={permissions}
              />
            )}
            {page === 'agenda' && (
              <Agenda
                realtimeUpdates={realtimeUpdates}
                permissions={permissions}
              />
            )}
            {page === 'notes' && (
              <Notes searchValue={search} user={user} realtimeEvent={notesRealtimeEvent} />
            )}
            {page === 'users' && permissions.canManageUsers && <Users />}
          </Box>
        </Box>

        <Snackbar
          open={toast.open}
          autoHideDuration={3500}
          onClose={() => setToast((current) => ({ ...current, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert
            onClose={() => setToast((current) => ({ ...current, open: false }))}
            severity={toast.severity}
            variant="filled"
            sx={{ minWidth: 280, boxShadow: 8 }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
