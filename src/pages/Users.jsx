import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockResetIcon from '@mui/icons-material/LockReset';
import { api, getErrorMessage, ROLE_LABELS } from '../services/api';
import { getColors } from '../theme/theme';

function roleChipColor(role, COLORS) {
  if (role === 'admin') return { color: COLORS.sim, bg: 'rgba(6,214,160,0.12)' };
  if (role === 'manager') return { color: COLORS.secondary, bg: 'rgba(0,180,216,0.12)' };
  return { color: COLORS.textMuted, bg: COLORS.border };
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const EMPTY_FORM = {
  nome: '',
  email: '',
  password: '',
  role: 'viewer',
  ativo: true,
};

const FILTERS = {
  role: 'all',
  status: 'all',
};

export default function Users() {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(FILTERS);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar os usuários.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
    setError('');
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setForm({
      nome: user.nome || '',
      email: user.email || '',
      password: '',
      role: user.role || 'viewer',
      ativo: Boolean(user.ativo),
    });
    setDialogOpen(true);
    setError('');
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      setError('Preencha nome e email para continuar.');
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setError('Defina uma senha para criar o usuário.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      role: form.role,
      ativo: Boolean(form.ativo),
      ...(form.password.trim() ? { password: form.password } : {}),
    };

    try {
      if (editingUser) {
        const updated = await api.updateUser(editingUser.id, payload);
        setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createUser(payload);
        setUsers((prev) => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })));
      }
      setDialogOpen(false);
      setEditingUser(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(getErrorMessage(err, editingUser ? 'Não foi possível atualizar o usuário.' : 'Não foi possível criar o usuário.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    setError('');
    try {
      const updated = await api.updateUser(user.id, { ativo: !user.ativo });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível atualizar o usuário.'));
    }
  };

  const handleResetPasswordShortcut = (user) => {
    openEditDialog(user);
    setForm((prev) => ({ ...prev, password: '' }));
  };

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !normalizedSearch
        || user.nome?.toLowerCase().includes(normalizedSearch)
        || user.email?.toLowerCase().includes(normalizedSearch);
      const matchesRole = filters.role === 'all' || user.role === filters.role;
      const matchesStatus = filters.status === 'all'
        || (filters.status === 'active' && user.ativo)
        || (filters.status === 'inactive' && !user.ativo);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [filters.role, filters.status, search, users]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.ativo).length,
    admins: users.filter((user) => user.role === 'admin').length,
    blocked: users.filter((user) => !user.ativo).length,
  }), [users]);

  const dialogTitle = editingUser ? 'Editar usuário' : 'Novo usuário';
  const dialogDescription = editingUser
    ? 'Atualize dados, permissões e defina uma nova senha somente se precisar trocar o acesso.'
    : 'Cadastre um novo usuário e configure o nível inicial de acesso.';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">Usuários</Typography>
          <Typography variant="body2" color="text.secondary">
            Controle de acesso, permissões e manutenção de contas do sistema
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadUsers} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Atualizar
          </Button>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openCreateDialog} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Novo usuário
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
          mb: 2,
        }}
      >
        {[
          { label: 'Total', value: stats.total },
          { label: 'Ativos', value: stats.active },
          { label: 'Admins', value: stats.admins },
          { label: 'Bloqueados', value: stats.blocked },
        ].map((item) => (
          <Card key={item.label} sx={{ border: `1px solid ${COLORS.border}` }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography variant="h5" fontWeight={700} color="text.primary">{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              label="Buscar usuário"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome ou email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
              <InputLabel>Perfil</InputLabel>
              <Select
                value={filters.role}
                label="Perfil"
                onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="manager">Gestor</MenuItem>
                <MenuItem value="viewer">Consulta</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Ativos</MenuItem>
                <MenuItem value="inactive">Bloqueados</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: isMobile ? 960 : 0 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Última atualização</TableCell>
                  <TableCell align="center">Ativo</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => {
                  const chip = roleChipColor(user.role, COLORS);
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: 'rgba(30,107,196,0.12)', color: COLORS.primaryLight, width: 36, height: 36 }}>
                            {user.nome?.slice(0, 2).toUpperCase() || 'US'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{user.nome}</Typography>
                            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ROLE_LABELS[user.role] || user.role}
                          sx={{ bgcolor: chip.bg, color: chip.color, border: `1px solid ${chip.color}44` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.ativo ? 'Liberado' : 'Bloqueado'}
                          sx={{
                            bgcolor: user.ativo ? 'rgba(6,214,160,0.12)' : 'rgba(239,68,68,0.10)',
                            color: user.ativo ? COLORS.sim : '#DC2626',
                            border: `1px solid ${user.ativo ? `${COLORS.sim}44` : '#DC262644'}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(user.updatedAt)}</TableCell>
                      <TableCell align="center">
                        <Switch checked={user.ativo} onChange={() => handleToggleActive(user)} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar cadastro">
                          <IconButton onClick={() => openEditDialog(user)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Trocar senha">
                          <IconButton onClick={() => handleResetPasswordShortcut(user)}>
                            <LockResetIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {users.length === 0
                          ? 'Nenhum usuário cadastrado.'
                          : 'Nenhum usuário corresponde aos filtros informados.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">{dialogDescription}</Alert>
            <TextField
              label="Nome"
              value={form.nome}
              size="small"
              onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              value={form.email}
              size="small"
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              fullWidth
            />
            <TextField
              label={editingUser ? 'Nova senha (opcional)' : 'Senha'}
              type="password"
              value={form.password}
              size="small"
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              helperText={editingUser ? 'Preencha apenas se quiser redefinir a senha atual.' : 'Defina a senha de acesso inicial.'}
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Perfil</InputLabel>
              <Select
                value={form.role}
                label="Perfil"
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="manager">Gestor</MenuItem>
                <MenuItem value="viewer">Consulta</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.ativo ? 'active' : 'inactive'}
                label="Status"
                onChange={(event) => setForm((prev) => ({ ...prev, ativo: event.target.value === 'active' }))}
              >
                <MenuItem value="active">Liberado</MenuItem>
                <MenuItem value="inactive">Bloqueado</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editingUser ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
