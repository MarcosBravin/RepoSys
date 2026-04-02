import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Tooltip,
  Button,
  Skeleton,
  TableSortLabel,
  Alert,
  useMediaQuery,
  Checkbox,
  Dialog,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { api, CATEGORIA_CONFIG, DIAS, STATUS_CONFIG, getErrorMessage, normalizeDiaLabel } from '../services/api';
import { getColors } from '../theme/theme';
import StatusChip from '../components/StatusChip';
import DetailDrawer from '../components/DetailDrawer';
import NewReposicaoDialog from '../components/NewReposicaoDialog';

const COLS = [
  { id: 'nome', label: 'Aluno', sortable: true },
  { id: 'dia', label: 'Dia', sortable: true },
  { id: 'horario', label: 'Horário', sortable: false },
  { id: 'categoria', label: 'Categoria', sortable: true },
  { id: 'obs', label: 'Observação', sortable: false },
  { id: 'status', label: 'Status', sortable: true },
  { id: 'actions', label: '', sortable: false },
];

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function Tabela({ searchValue, realtimeUpdates, permissions }) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('nome');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterDia, setFilterDia] = useState('TODOS');
  const [filterCategoria, setFilterCategoria] = useState('TODOS');
  const [showFilters, setShowFilters] = useState(false);
  const [newDialog, setNewDialog] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchValue) params.search = searchValue;
      if (filterStatus !== 'TODOS') params.status = filterStatus;
      if (filterDia !== 'TODOS') params.dia = filterDia;
      if (filterCategoria !== 'TODOS') params.categoria = filterCategoria;
      const data = await api.getAll(params);
      setRows(data);
      setSelectedIds((current) => current.filter((id) => data.some((row) => row.id === id)));
      setPage(0);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as reposições.'));
    } finally {
      setLoading(false);
    }
  }, [searchValue, filterStatus, filterDia, filterCategoria]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!realtimeUpdates) return;
    load();
  }, [realtimeUpdates, load]);

  const handleSort = (col) => {
    const isAsc = orderBy === col && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const handleToggleRow = (id) => {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    ));
  };

  const handleToggleAllPageRows = (checked) => {
    const pageIds = paginated.map((row) => row.id);
    if (checked) {
      setSelectedIds((current) => Array.from(new Set([...current, ...pageIds])));
      return;
    }
    setSelectedIds((current) => current.filter((id) => !pageIds.includes(id)));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;

    setDeleting(true);
    setError('');
    try {
      await Promise.all(selectedIds.map((id) => api.remove(id)));
      setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível excluir as reposições selecionadas.'));
    } finally {
      setDeleting(false);
    }
  };

  const sorted = [...rows].sort(getComparator(order, orderBy));
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const allPageSelected = paginated.length > 0 && paginated.every((row) => selectedIds.includes(row.id));
  const somePageSelected = paginated.some((row) => selectedIds.includes(row.id));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">Reposições</Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? '...' : `${rows.length} registros encontrados`}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters((value) => !value)}
            sx={{
              color: showFilters ? COLORS.primaryLight : 'text.secondary',
              borderColor: showFilters ? COLORS.primaryLight : COLORS.border,
              width: { xs: '100%', sm: 'auto' },
            }}>
            Filtros
          </Button>

          {permissions?.canDeleteReposicoes && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              disabled={!selectedIds.length}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Excluir em massa
            </Button>
          )}

          {permissions?.canManageReposicoes && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setNewDialog(true)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Nova
            </Button>
          )}
        </Stack>
      </Box>

      {selectedIds.length > 0 && permissions?.canDeleteReposicoes && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {selectedIds.length} reposição(ões) selecionada(s) para exclusão em massa.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {showFilters && (
        <Card sx={{ mb: 2, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(event) => setFilterStatus(event.target.value)}>
                <MenuItem value="TODOS">Todos</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Dia</InputLabel>
              <Select value={filterDia} label="Dia" onChange={(event) => setFilterDia(event.target.value)}>
                <MenuItem value="TODOS">Todos</MenuItem>
                {DIAS.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Categoria</InputLabel>
              <Select value={filterCategoria} label="Categoria" onChange={(event) => setFilterCategoria(event.target.value)}>
                <MenuItem value="TODOS">Todas</MenuItem>
                {Object.keys(CATEGORIA_CONFIG).map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </Card>
      )}

      <Card>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: isMobile ? 820 : 0 }}>
            <TableHead>
              <TableRow>
                {permissions?.canDeleteReposicoes && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={allPageSelected}
                      indeterminate={!allPageSelected && somePageSelected}
                      onChange={(event) => handleToggleAllPageRows(event.target.checked)}
                    />
                  </TableCell>
                )}
                {COLS.map((col) => (
                  <TableCell key={col.id} sx={{ whiteSpace: 'nowrap' }}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : 'asc'}
                        onClick={() => handleSort(col.id)}>
                        {col.label}
                      </TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    {permissions?.canDeleteReposicoes && (
                      <TableCell padding="checkbox">
                        <Skeleton variant="circular" width={20} height={20} />
                      </TableCell>
                    )}
                    {COLS.map((col) => (
                      <TableCell key={col.id}><Skeleton variant="text" height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.map((row) => {
                const catCfg = CATEGORIA_CONFIG[row.categoria] || CATEGORIA_CONFIG.GERAL;
                const isChecked = selectedIds.includes(row.id);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    selected={isChecked}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.03)' } }}
                    onClick={() => setSelected(row)}>
                    {permissions?.canDeleteReposicoes && (
                      <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                        <Checkbox checked={isChecked} onChange={() => handleToggleRow(row.id)} />
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} color="text.primary" noWrap sx={{ maxWidth: 200 }}>
                        {row.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={normalizeDiaLabel(row.dia, row.horario)} sx={{ fontSize: '0.65rem', height: 20, bgcolor: COLORS.border, color: COLORS.textMuted }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                        {row.horario || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.categoria} sx={{ fontSize: '0.65rem', height: 20, bgcolor: catCfg.color + '22', color: catCfg.color }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                        {row.obs ? (row.obs.length > 60 ? row.obs.slice(0, 60) + '…' : row.obs) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell><StatusChip status={row.status} /></TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="Ver detalhes">
                        <IconButton size="small" onClick={() => setSelected(row)} sx={{ color: 'text.secondary' }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={permissions?.canDeleteReposicoes ? 8 : 7} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum registro encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{
            borderTop: `1px solid ${COLORS.border}`,
            '& .MuiTablePagination-toolbar': { px: { xs: 1, sm: 2 }, flexWrap: 'wrap', rowGap: 1 },
            '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } },
          }}
        />
      </Card>

      <DetailDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onSave={(updated) => {
          setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
          setSelected(updated);
        }}
        onDelete={(id) => {
          setRows((prev) => prev.filter((row) => row.id !== id));
          setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
          setSelected(null);
        }}
        permissions={permissions}
      />

      {permissions?.canManageReposicoes && (
        <NewReposicaoDialog
          open={newDialog}
          onClose={() => setNewDialog(false)}
          onCreated={(item) => {
            setRows((prev) => [item, ...prev]);
            setNewDialog(false);
          }}
        />
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Excluir reposições selecionadas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Você está prestes a excluir {selectedIds.length} reposição(ões). Esta ação não pode ser desfeita.
          </Typography>
        </Box>
        <Box sx={{ px: 3, pb: 3, display: 'flex', gap: 1.25, justifyContent: 'flex-end', flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
          <Button variant="outlined" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" startIcon={<DeleteSweepIcon />} onClick={handleBulkDelete} disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir em massa'}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
