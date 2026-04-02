import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Button,
  IconButton,
  Link,
  Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';
import { ROLE_LABELS, canManageUsers } from '../services/api';
import { getColors } from '../theme/theme';

export default function Sidebar({
  currentPage,
  onNavigate,
  stats,
  user,
  mobileOpen,
  onCloseMobile,
  onLogout,
  collapsed,
  drawerWidth,
  collapsedWidth,
  onToggleCollapsed,
}) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const activeWidth = collapsed ? collapsedWidth : drawerWidth;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'tabela', label: 'Reposições', icon: <TableChartIcon /> },
    { id: 'agenda', label: 'Agenda Semanal', icon: <CalendarMonthIcon /> },
    { id: 'notes', label: 'Anotações', icon: <StickyNote2OutlinedIcon /> },
  ];

  if (canManageUsers(user?.role)) {
    navItems.push({ id: 'users', label: 'Usuários', icon: <ManageAccountsIcon /> });
  }

  const renderHeader = (
    <Box sx={{
      px: collapsed ? 1.25 : 2.5,
      py: 2,
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'space-between',
      gap: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 1.25, minWidth: 0 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 1.5, overflow: 'hidden',
          background: COLORS.surfaceAlt,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Box component="img" src="/logo.png" alt="RepoSys" sx={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.22)' }} />
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} color="text.primary" lineHeight={1.2}>
              RepoSys
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gestão de Aulas
            </Typography>
          </Box>
        )}
      </Box>

      {!collapsed && (
        <Tooltip title="Recolher menu">
          <IconButton size="small" onClick={onToggleCollapsed} sx={{ color: 'text.secondary', display: { xs: 'none', lg: 'inline-flex' } }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderHeader}

      {collapsed ? (
        <Box sx={{ py: 1, display: { xs: 'none', lg: 'flex' }, justifyContent: 'center' }}>
          <Tooltip title="Expandir menu">
            <IconButton size="small" onClick={onToggleCollapsed} sx={{ color: 'text.secondary' }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <>
          {user && (
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${COLORS.border}` }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Sessão ativa
              </Typography>
              <Typography variant="body2" fontWeight={600}>{user.nome}</Typography>
              <Chip size="small" label={ROLE_LABELS[user.role] || user.role} sx={{ mt: 1, bgcolor: 'rgba(30,107,196,0.18)', color: COLORS.primaryLight }} />
            </Box>
          )}

          {stats && (
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${COLORS.border}` }}>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip size="small" label={`${stats.total || 0} total`} sx={{ fontSize: '0.65rem', height: 20, bgcolor: COLORS.border, color: COLORS.textMuted }} />
                <Chip size="small" label={`${stats.pendentes || 0} pendentes`} sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }} />
                <Chip size="small" label={`${stats.concluidas || 0} feitos`} sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(30,107,196,0.15)', color: '#60A5FA' }} />
              </Box>
            </Box>
          )}
        </>
      )}

      <Box sx={{ px: collapsed ? 0.75 : 1, pt: 1.5 }}>
        {!collapsed && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, pb: 0.5, display: 'block', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Menu
          </Typography>
        )}
        <List dense disablePadding>
          {navItems.map((item) => {
            const active = currentPage === item.id;
            const button = (
              <ListItemButton
                onClick={() => onNavigate(item.id)}
                sx={{
                  borderRadius: 1.5,
                  px: collapsed ? 1.2 : 1.5,
                  py: 1,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  backgroundColor: active ? 'rgba(30,107,196,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(30,107,196,0.3)' : '1px solid transparent',
                  '&:hover': { backgroundColor: active ? 'rgba(30,107,196,0.2)' : 'rgba(255,255,255,0.04)' },
                  transition: 'all 0.15s ease',
                }}>
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, mr: collapsed ? 0 : 0.5, color: active ? COLORS.primaryLight : COLORS.textMuted, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'text.primary' : 'text.secondary',
                    }}
                  />
                )}
              </ListItemButton>
            );

            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.25, px: collapsed ? 0.75 : 0 }}>
                {collapsed ? <Tooltip title={item.label} placement="right">{button}</Tooltip> : button}
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ my: 1.5, mx: collapsed ? 1 : 2, borderColor: COLORS.border }} />

      <Box sx={{ px: collapsed ? 0.75 : 2.5, mt: 'auto', pb: 2.5 }}>
        {collapsed ? (
          <Box sx={{ height: 16 }} />
        ) : (
          <Box sx={{ px: 0.25, pt: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
              Desenvolvido por{' '}
              <Link
                href="https://github.com/MarcosBravin"
                target="_blank"
                rel="noreferrer"
                underline="hover"
                sx={{
                  fontSize: 'inherit',
                  color: COLORS.textMuted,
                  transition: 'color 0.15s ease',
                  '&:hover': { color: COLORS.text },
                }}>
                Marcos Bravin
              </Link>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.45 }}>
              © 2026 Todos os direitos reservados
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', pt: 0 },
        }}>
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: activeWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: activeWidth, boxSizing: 'border-box', pt: 0, overflowX: 'hidden' },
        }}>
        {drawerContent}
      </Drawer>
    </>
  );
}
