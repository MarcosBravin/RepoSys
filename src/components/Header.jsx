import React from 'react';
import {
  AppBar,
  Toolbar,
  InputBase,
  Box,
  IconButton,
  Badge,
  Avatar,
  Typography,
  Tooltip,
  Chip,
  Button,
  FormControl,
  Select,
  MenuItem,
  Menu,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { useTheme } from '@mui/material/styles';
import { ROLE_LABELS, normalizeDiaLabel } from '../services/api';
import { getColors } from '../theme/theme';

export default function Header({
  onSearch,
  searchValue,
  connected,
  pendingCount,
  pendingItems,
  user,
  themeMode,
  onThemeModeChange,
  canInstallPwa,
  onInstallPwa,
  onOpenMobileNav,
  onToggleSidebar,
  showMenuButton,
  sidebarCollapsed,
  sidebarWidth,
  onLogout,
}) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const [notificationsAnchor, setNotificationsAnchor] = React.useState(null);

  const notificationsOpen = Boolean(notificationsAnchor);

  return (
    <AppBar position="fixed" sx={{ zIndex: (themeObject) => themeObject.zIndex.drawer + 1, left: { lg: sidebarWidth }, width: { lg: `calc(100% - ${sidebarWidth}px)` } }}>
      <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minHeight: { xs: 'auto !important', sm: '68px !important' }, py: { xs: 1, sm: 0.75 }, flexWrap: 'wrap' }}>
        {showMenuButton ? (
          <IconButton onClick={onOpenMobileNav} sx={{ color: 'text.primary', display: { xs: 'inline-flex', lg: 'none' } }}>
            <MenuIcon />
          </IconButton>
        ) : (
          <Tooltip title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
            <IconButton onClick={onToggleSidebar} sx={{ color: 'text.primary', display: { xs: 'none', lg: 'inline-flex' } }}>
              {sidebarCollapsed ? <KeyboardDoubleArrowRightIcon /> : <KeyboardDoubleArrowLeftIcon />}
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          backgroundColor: COLORS.surfaceAlt,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 1.5, px: 1.5, py: 0.5,
          flex: { xs: '1 1 100%', sm: 1 }, maxWidth: { xs: '100%', md: 520 }, order: { xs: 3, sm: 1 },
          transition: 'border-color 0.2s',
          '&:focus-within': { borderColor: COLORS.primaryLight },
        }}>
          <SearchIcon sx={{ color: COLORS.textMuted, fontSize: 18 }} />
          <InputBase
            placeholder="Buscar aluno, observação, horário..."
            value={searchValue}
            onChange={(event) => onSearch(event.target.value)}
            sx={{
              flex: 1, fontSize: '0.875rem',
              color: 'text.primary',
              '& input::placeholder': { color: COLORS.textMuted, opacity: 1 },
            }}
          />
        </Box>

        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' }, order: 2 }} />

        <FormControl size="small" sx={{ minWidth: { xs: 110, sm: 120 }, order: { xs: 2, sm: 3 } }}>
          <Select value={themeMode} onChange={(event) => onThemeModeChange(event.target.value)} sx={{ bgcolor: COLORS.surfaceAlt }}>
            <MenuItem value="system">Sistema</MenuItem>
            <MenuItem value="light">Claro</MenuItem>
            <MenuItem value="dark">Escuro</MenuItem>
          </Select>
        </FormControl>

        {canInstallPwa && (
          <Tooltip title="Instalar aplicativo">
            <Button variant="contained" size="small" startIcon={<DownloadForOfflineIcon />} onClick={onInstallPwa} sx={{ whiteSpace: 'nowrap', order: { xs: 5, sm: 4 } }}>
              Instalar app
            </Button>
          </Tooltip>
        )}

        <Tooltip title={connected ? 'Conexão em tempo real ativa' : 'Sem conexão em tempo real'}>
          <Chip
            size="small"
            icon={connected ? <WifiIcon sx={{ fontSize: '14px !important' }} /> : <WifiOffIcon sx={{ fontSize: '14px !important' }} />}
            label={connected ? 'Ao vivo' : 'Offline'}
            sx={{
              fontSize: '0.7rem', height: 24,
              bgcolor: connected ? 'rgba(6,214,160,0.12)' : 'rgba(239,68,68,0.12)',
              color: connected ? COLORS.sim : '#EF4444',
              border: `1px solid ${connected ? COLORS.sim + '44' : '#EF444444'}`,
              '& .MuiChip-icon': { color: 'inherit' },
              display: { xs: 'none', sm: 'inline-flex' },
              order: 5,
            }}
          />
        </Tooltip>

        <Tooltip title={`${pendingCount} reposições pendentes`}>
          <IconButton size="small" sx={{ color: 'text.secondary', order: 6 }} onClick={(event) => setNotificationsAnchor(event.currentTarget)}>
            <Badge badgeContent={pendingCount} color="warning" max={99} sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}>
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 'auto', sm: 0 }, order: { xs: 1, sm: 7 } }}>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
            <Typography variant="caption" color="text.primary" fontWeight={600} display="block" lineHeight={1.3}>
              {user?.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {ROLE_LABELS[user?.role] || 'Usuário'}
            </Typography>
          </Box>
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.secondary})`, fontWeight: 700 }}>
            {user?.nome?.slice(0, 2).toUpperCase() || 'US'}
          </Avatar>
          <Button variant="outlined" size="small" startIcon={<LogoutIcon />} onClick={onLogout} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Sair
          </Button>
          <Tooltip title="Sair">
            <IconButton onClick={onLogout} sx={{ color: 'text.primary', display: { xs: 'inline-flex', sm: 'none' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      <Menu
        anchorEl={notificationsAnchor}
        open={notificationsOpen}
        onClose={() => setNotificationsAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            bgcolor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 18px 42px rgba(0,0,0,0.28)',
          },
        }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Reposições pendentes
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pendingCount} aguardando confirmação
          </Typography>
        </Box>
        <Divider sx={{ borderColor: COLORS.border }} />
        {pendingItems?.length ? (
          <List dense disablePadding sx={{ py: 0.5, maxHeight: 360, overflowY: 'auto' }}>
            {pendingItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem sx={{ px: 2, py: 1, alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={item.nome}
                    secondary={`${normalizeDiaLabel(item.dia, item.horario)}${item.horario ? ` • ${item.horario}` : ''}`}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}
                    secondaryTypographyProps={{ fontSize: '0.72rem', color: 'text.secondary' }}
                  />
                </ListItem>
                {index < pendingItems.length - 1 && <Divider sx={{ borderColor: COLORS.border }} />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Não há reposições pendentes no momento.
            </Typography>
          </Box>
        )}
      </Menu>
    </AppBar>
  );
}
