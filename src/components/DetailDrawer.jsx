import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Stack,
  Alert,
  FormHelperText,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NoteIcon from '@mui/icons-material/Note';
import CategoryIcon from '@mui/icons-material/Category';
import { useTheme } from '@mui/material/styles';
import { getColors } from '../theme/theme';
import {
  api,
  STATUS_CONFIG,
  DIAS,
  CATEGORIA_CONFIG,
  getErrorMessage,
  normalizeDiaLabel,
  extractScheduleFields,
  buildHorarioLabel,
  inferDiaFromDateValue,
  resolveDia,
} from '../services/api';
import StatusChip from './StatusChip';

export default function DetailDrawer({ item, onClose, onSave, onDelete, permissions }) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const isLight = theme.palette.mode === 'light';
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(item || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!item) {
      setForm({});
      setEditing(false);
      setError('');
      setConfirmDeleteOpen(false);
      return;
    }

    const schedule = extractScheduleFields(item.horario);
    setForm({
      ...item,
      dia: resolveDia(item.dia, item.horario),
      data: schedule.date,
      hora: schedule.time,
      horarioDetalhe: schedule.details,
    });
    setEditing(false);
    setError('');
    setConfirmDeleteOpen(false);
  }, [item]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const diaResolvido = inferDiaFromDateValue(form.data) || form.dia;
      const payload = {
        ...form,
        dia: diaResolvido,
        horario: buildHorarioLabel({
          date: form.data,
          time: form.hora,
          details: form.horarioDetalhe,
        }),
      };

      const updated = await api.update(item.id, payload);
      onSave(updated);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar. Verifique a conexão com o servidor.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.remove(item.id);
      onDelete(item.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao remover.'));
    }
  };

  if (!item) return null;

  const catCfg = CATEGORIA_CONFIG[item.categoria] || CATEGORIA_CONFIG.GERAL;
  const resolvedDiaLabel = normalizeDiaLabel(item.dia, item.horario);
  const drawerHeaderBackground = isLight
    ? 'linear-gradient(135deg, #D7E7FA 0%, #EDF5FF 55%, #FFFFFF 100%)'
    : `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.surfaceAlt})`;
  const drawerHeaderBorder = isLight ? '#C6D9F0' : COLORS.border;
  const drawerHeaderText = isLight ? '#163250' : 'text.primary';
  const drawerHeaderMuted = isLight ? '#5A7392' : 'text.secondary';
  const infoCardBackground = isLight ? '#F7FAFE' : COLORS.surfaceAlt;
  const infoCardBorder = isLight ? '#C9DBEE' : COLORS.border;
  const emphasisCardBackground = isLight
    ? 'linear-gradient(180deg, #F7FAFE 0%, #EEF5FD 100%)'
    : `linear-gradient(180deg, ${COLORS.surfaceAlt}, ${COLORS.surface})`;
  const summaryBackground = isLight
    ? 'linear-gradient(180deg, #F8FBFF 0%, #F0F6FD 100%)'
    : `linear-gradient(180deg, ${COLORS.surfaceAlt}, ${COLORS.surface})`;

  return (
    <Dialog
      open={!!item}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          border: `1px solid ${COLORS.border}`,
          borderRadius: fullScreen ? 0 : 3,
          overflow: 'hidden',
          minHeight: fullScreen ? '100vh' : 620,
        },
      }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: fullScreen ? '100vh' : 620 }}>
        <Box sx={{
          px: { xs: 2, sm: 3.5 },
          py: { xs: 2, sm: 3 },
          background: drawerHeaderBackground,
          borderBottom: `1px solid ${drawerHeaderBorder}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Box sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
              }}>
                <PersonIcon sx={{ color: '#fff', fontSize: 24 }} />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ letterSpacing: '0.12em', color: drawerHeaderMuted }}>
                  Reposição #{item.id}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.15, wordBreak: 'break-word', color: drawerHeaderText }}>
                  {item.nome}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: drawerHeaderMuted }}>
                  {editing ? 'Edite as informações abaixo e salve quando terminar.' : 'Visualização detalhada da reposição selecionada.'}
                </Typography>
              </Box>
            </Box>

            <IconButton onClick={onClose} sx={{ color: drawerHeaderMuted, flexShrink: 0 }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <StatusChip status={item.status} />
            <Chip
              size="small"
              label={item.categoria}
              sx={{ fontSize: '0.68rem', bgcolor: catCfg.color + '22', color: catCfg.color, border: `1px solid ${catCfg.color}44` }}
            />
            <Chip
              size="small"
              label={resolvedDiaLabel}
              sx={{ fontSize: '0.68rem', bgcolor: isLight ? '#E8F0FA' : COLORS.border, color: isLight ? '#5A7392' : COLORS.textMuted }}
            />
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, sm: 3.5 }, py: { xs: 2, sm: 3 } }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!editing ? (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2,
                  '& > :nth-of-type(2)': {
                    gridColumn: { xs: 'auto', md: 'span 2' },
                  },
                }}>
                <InfoCard icon={<CalendarTodayIcon />} label="Dia" value={resolvedDiaLabel} colors={COLORS} compact />
                <InfoCard icon={<AccessTimeIcon />} label="Horário" value={item.horario || 'Não informado'} colors={COLORS} />
                <InfoCard icon={<CategoryIcon />} label="Categoria" value={item.categoria} colors={COLORS} compact />
                <InfoCard icon={<PersonIcon />} label="Aluno" value={item.nome} colors={COLORS} compact />
              </Box>

              <Box
                sx={{
                  p: 2.25,
                  borderRadius: 2,
                  border: `1px solid ${infoCardBorder}`,
                  background: summaryBackground,
                  mt: 0.5,
                }}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
                  Observação
                </Typography>
                <Typography variant="body1" color="text.primary" sx={{ mt: 0.75, whiteSpace: 'pre-wrap', lineHeight: 1.8, maxWidth: 720 }}>
                  {item.obs || 'Sem observações registradas.'}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField
                label="Nome do Aluno"
                value={form.nome || ''}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                size="small"
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Data"
                  type="date"
                  value={form.data || ''}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setForm((current) => ({
                      ...current,
                      data: nextDate,
                      dia: inferDiaFromDateValue(nextDate) || current.dia,
                    }));
                  }}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Hora"
                  type="time"
                  value={form.hora || ''}
                  onChange={(event) => setForm({ ...form, hora: event.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <TextField
                label="Complemento de horário"
                value={form.horarioDetalhe || ''}
                onChange={(event) => setForm({ ...form, horarioDetalhe: event.target.value })}
                size="small"
                fullWidth
                placeholder="Ex: sala, turno, observação curta"
              />

              <TextField
                label="Observação"
                value={form.obs || ''}
                onChange={(event) => setForm({ ...form, obs: event.target.value })}
                size="small"
                fullWidth
                multiline
                rows={4}
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2,
                }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={form.status || 'PENDENTE'}
                    label="Status"
                    onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <MenuItem key={key} value={key}>{value.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Dia</InputLabel>
                  <Select
                    value={form.dia || 'SEGUNDA'}
                    label="Dia"
                    disabled={Boolean(form.data)}
                    onChange={(event) => setForm({ ...form, dia: event.target.value })}>
                    {DIAS.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
                  </Select>
                  <FormHelperText>
                    {form.data ? 'Dia definido automaticamente pela data escolhida.' : 'Selecione manualmente quando não houver data.'}
                  </FormHelperText>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={form.categoria || 'GERAL'}
                    label="Categoria"
                    onChange={(event) => setForm({ ...form, categoria: event.target.value })}>
                    {Object.keys(CATEGORIA_CONFIG).map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderTop: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            display: 'flex',
            gap: 1.25,
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
          }}>
          {!editing ? (
            <>
              <Box sx={{ display: 'flex', gap: 1.25, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
                {permissions?.canManageReposicoes && (
                  <Button variant="contained" size="large" startIcon={<EditIcon />} onClick={() => setEditing(true)} sx={{ minWidth: 180 }}>
                    Editar reposição
                  </Button>
                )}
                <Button variant="outlined" size="large" onClick={onClose}>
                  Fechar
                </Button>
              </Box>

              {permissions?.canDeleteReposicoes && (
                <Button variant="outlined" color="error" size="large" startIcon={<DeleteIcon />} onClick={() => setConfirmDeleteOpen(true)}>
                  Excluir
                </Button>
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1.25, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
                <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ minWidth: 180 }}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
                <Button variant="outlined" size="large" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </Box>

              {permissions?.canDeleteReposicoes && (
                <Button variant="outlined" color="error" size="large" startIcon={<DeleteIcon />} onClick={() => setConfirmDeleteOpen(true)}>
                  Excluir
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
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
          <Stack spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(239,68,68,0.12)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <DeleteIcon />
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Excluir reposição
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Você está prestes a remover a reposição de <strong>{item.nome}</strong>. Esta ação não pode ser desfeita.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            px: 3,
            pb: 3,
            display: 'flex',
            gap: 1.25,
            justifyContent: 'flex-end',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
          }}>
          <Button variant="outlined" onClick={() => setConfirmDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" startIcon={<DeleteIcon />} onClick={handleDelete}>
            Excluir agora
          </Button>
        </Box>
      </Dialog>
    </Dialog>
  );
}

function InfoCard({ icon, label, value, colors, compact = false, emphasis = false, sx = {} }) {
  const isLightCard = colors.surfaceAlt === '#F8FBFF';
  const cardBorder = isLightCard ? '#C9DBEE' : colors.border;
  const cardBackground = emphasis
    ? (isLightCard ? 'linear-gradient(180deg, #F7FAFE 0%, #EEF5FD 100%)' : `linear-gradient(180deg, ${colors.surfaceAlt}, ${colors.surface})`)
    : (isLightCard ? '#F7FAFE' : colors.surfaceAlt);

  return (
    <Box
      sx={{
        p: compact ? 1.5 : 2.25,
        borderRadius: 2,
        border: `1px solid ${cardBorder}`,
        background: cardBackground,
        minHeight: compact ? 110 : 'auto',
        ...sx,
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, mb: 1 }}>
        {React.cloneElement(icon, { sx: { fontSize: 16, color: colors.textMuted } })}
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant={emphasis ? 'h6' : 'body1'}
        color="text.primary"
        fontWeight={600}
        sx={{
          whiteSpace: compact ? 'normal' : 'pre-wrap',
          lineHeight: emphasis ? 1.55 : 1.6,
          wordBreak: 'break-word',
        }}>
        {value}
      </Typography>
    </Box>
  );
}
