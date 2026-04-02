import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { api, getErrorMessage } from '../services/api';
import { getColors } from '../theme/theme';

const NOTE_COLORS = {
  sun: { label: 'Solar', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)', accent: '#F59E0B' },
  mint: { label: 'Menta', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.24)', accent: '#10B981' },
  sky: { label: 'Céu', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.24)', accent: '#3B82F6' },
  lavender: { label: 'Lavanda', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.24)', accent: '#8B5CF6' },
  rose: { label: 'Rosa', bg: 'rgba(244,63,94,0.10)', border: 'rgba(244,63,94,0.24)', accent: '#F43F5E' },
  slate: { label: 'Neutro', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.24)', accent: '#94A3B8' },
  cobalt: { label: 'Cobalto', bg: 'rgba(29,78,216,0.12)', border: 'rgba(29,78,216,0.28)', accent: '#1D4ED8', adminOnly: true },
  terracotta: { label: 'Terracota', bg: 'rgba(194,65,12,0.12)', border: 'rgba(194,65,12,0.28)', accent: '#C2410C', adminOnly: true },
};

const EMPTY_NOTE = {
  title: '',
  content: '',
  color: 'sun',
  scope: 'personal',
  pinned: false,
};

function sortNotes(items) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function formatTimestamp(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NoteCard({ note, colors, onEdit, onDelete, onTogglePin }) {
  const palette = NOTE_COLORS[note.color] || NOTE_COLORS.sun;
  const cardBackground = palette.adminOnly
    ? `linear-gradient(180deg, ${palette.bg} 0%, ${colors.surface} 78%)`
    : colors.surface;

  return (
    <Card sx={{
      minHeight: 220,
      borderRadius: 3,
      background: cardBackground,
      border: `1px solid ${palette.border}`,
      boxShadow: 'none',
      overflow: 'hidden',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: '0 auto 0 0',
        width: 4,
        backgroundColor: palette.accent,
      },
      '&:hover': {
        borderColor: palette.accent,
      },
    }}>
      <CardContent sx={{ p: 2.25, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.25 }}>
              {note.title || 'Anotação rápida'}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.9 }}>
              {note.pinned && (
                <Chip
                  size="small"
                  label="Fixada"
                  sx={{ bgcolor: `${palette.accent}1A`, color: palette.accent, border: `1px solid ${palette.accent}33` }}
                />
              )}
              <Chip
                size="small"
                label={note.scope === 'general' ? 'Geral' : 'Pessoal'}
                sx={{
                  bgcolor: note.scope === 'general' ? 'rgba(30,107,196,0.12)' : colors.surfaceAlt,
                  color: note.scope === 'general' ? colors.primaryLight : colors.textMuted,
                  border: `1px solid ${note.scope === 'general' ? `${colors.primaryLight}33` : colors.border}`,
                }}
              />
              <Chip
                size="small"
                label={palette.label}
                sx={{ bgcolor: palette.bg, color: palette.accent, border: `1px solid ${palette.border}` }}
              />
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.25}>
            <Tooltip title={note.pinned ? 'Desfixar' : 'Fixar'}>
              <IconButton size="small" onClick={() => onTogglePin(note)}>
                <PushPinOutlinedIcon sx={{ fontSize: 18, color: note.pinned ? palette.accent : colors.textMuted }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEdit(note)}>
                <EditOutlinedIcon sx={{ fontSize: 18, color: colors.textMuted }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <IconButton size="small" onClick={() => onDelete(note)}>
                <DeleteOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.75,
            flex: 1,
            wordBreak: 'break-word',
          }}>
          {note.content}
        </Typography>

        <Box sx={{ pt: 1.25, borderTop: `1px solid ${colors.border}` }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {note.authorName || 'Sem autor identificado'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.6 }}>
            <AccessTimeIcon sx={{ fontSize: 14, color: colors.textMuted }} />
            <Typography variant="caption" color="text.secondary">
              Atualizada em {formatTimestamp(note.updatedAt)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Notes({ searchValue, user, realtimeEvent }) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const isAdmin = user?.role === 'admin';
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_NOTE);
  const [editingNote, setEditingNote] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_NOTE);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const loadNotes = async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getNotes(search ? { search } : {});
      setNotes(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as anotações.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadNotes(searchValue || '');
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    if (!realtimeEvent) return;
    loadNotes(searchValue || '');
  }, [realtimeEvent, searchValue]);

  const pinnedNotes = useMemo(() => notes.filter((item) => item.pinned), [notes]);
  const regularNotes = useMemo(() => notes.filter((item) => !item.pinned), [notes]);
  const myNotesCount = useMemo(() => notes.filter((item) => item.createdBy === user?.id).length, [notes, user]);

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateForm(EMPTY_NOTE);
    setCreateError('');
  };

  const handleCreate = async () => {
    if (!createForm.content.trim()) {
      setCreateError('Escreva o conteúdo da anotação antes de salvar.');
      return;
    }

    setSaving(true);
    setCreateError('');
    try {
      const created = await api.createNote(createForm);
      setNotes((prev) => sortNotes([created, ...prev]));
      closeCreateModal();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Não foi possível criar a anotação.'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (note) => {
    setEditingNote(note);
    setEditError('');
    setEditForm({
      title: note.title || '',
      content: note.content || '',
      color: note.color || 'sun',
      scope: note.scope || 'personal',
      pinned: Boolean(note.pinned),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingNote) return;
    if (!editForm.content.trim()) {
      setEditError('O conteúdo da anotação não pode ficar vazio.');
      return;
    }

    setSaving(true);
    setEditError('');
    try {
      const updated = await api.updateNote(editingNote.id, editForm);
      setNotes((prev) => sortNotes(prev.map((item) => (item.id === updated.id ? updated : item))));
      setEditingNote(null);
      setEditError('');
    } catch (err) {
      setEditError(getErrorMessage(err, 'Não foi possível salvar a anotação.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (note) => {
    try {
      const updated = await api.updateNote(note.id, { pinned: !note.pinned });
      setNotes((prev) => sortNotes(prev.map((item) => (item.id === updated.id ? updated : item))));
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível atualizar a anotação.'));
    }
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;

    setSaving(true);
    setError('');
    try {
      await api.removeNote(noteToDelete.id);
      setNotes((prev) => prev.filter((item) => item.id !== noteToDelete.id));
      setNoteToDelete(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível excluir a anotação.'));
    } finally {
      setSaving(false);
    }
  };

  const renderColorSelector = (value, onChange) => (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {Object.entries(NOTE_COLORS).filter(([, palette]) => isAdmin || !palette.adminOnly).map(([key, palette]) => {
        const active = value === key;
        return (
          <Button
            key={key}
            variant={active ? 'contained' : 'outlined'}
            onClick={() => onChange(key)}
            sx={{
              minWidth: 0,
              px: 1.25,
              borderColor: palette.border,
              color: active ? '#fff' : palette.accent,
              background: active ? palette.accent : 'transparent',
              '&:hover': {
                borderColor: palette.accent,
                background: active ? palette.accent : `${palette.accent}12`,
              },
            }}>
            {palette.label}{palette.adminOnly ? ' Admin' : ''}
          </Button>
        );
      })}
    </Stack>
  );

  const statItems = [
    { label: 'Total', value: notes.length },
    { label: 'Fixadas', value: pinnedNotes.length },
    { label: 'Minhas', value: myNotesCount },
  ];

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 1.5,
        }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">Anotações</Typography>
            <Typography variant="body2" color="text.secondary">
              Lembretes e recados internos em um espaço simples e rápido.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<NoteAddOutlinedIcon />}
            onClick={() => {
              setError('');
              setCreateError('');
              setCreateModalOpen(true);
            }}
            sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
            Nova anotação
          </Button>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {statItems.map((item) => (
            <Chip
              key={item.label}
              label={`${item.label}: ${item.value}`}
              sx={{
                height: 30,
                bgcolor: colors.surfaceAlt,
                color: 'text.secondary',
                border: `1px solid ${colors.border}`,
              }}
            />
          ))}
        </Stack>
      </Box>

      {error && !createModalOpen && !editingNote && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {pinnedNotes.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ mb: 1.25 }}>
            Fixadas
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 1.5,
          }}>
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                colors={colors}
                onEdit={handleOpenEdit}
                onDelete={setNoteToDelete}
                onTogglePin={handleTogglePin}
              />
            ))}
          </Box>
        </Box>
      )}

      <Box>
        <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ mb: 1.25 }}>
          {pinnedNotes.length > 0 ? 'Demais anotações' : 'Todas as anotações'}
        </Typography>

        {loading ? (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Carregando anotações...</Typography>
            </CardContent>
          </Card>
        ) : regularNotes.length > 0 ? (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 1.5,
          }}>
            {regularNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                colors={colors}
                onEdit={handleOpenEdit}
                onDelete={setNoteToDelete}
                onTogglePin={handleTogglePin}
              />
            ))}
          </Box>
        ) : (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ mb: 0.75 }}>
                Nenhuma anotação encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchValue ? 'Tente outro termo na busca do topo.' : 'Crie o primeiro post-it para começar.'}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <Dialog open={createModalOpen} onClose={closeCreateModal} fullWidth maxWidth="sm">
        <DialogTitle>Nova anotação</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="Título"
              size="small"
              value={createForm.title}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Escreva sua anotação"
              multiline
              minRows={5}
              value={createForm.content}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, content: event.target.value }))}
              fullWidth
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Cor do post-it
              </Typography>
              {renderColorSelector(createForm.color, (color) => setCreateForm((prev) => ({ ...prev, color })))}
              {isAdmin && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Cobalto e Terracota sao cores exclusivas para administradores.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Visibilidade
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant={createForm.scope === 'personal' ? 'contained' : 'outlined'}
                  onClick={() => setCreateForm((prev) => ({ ...prev, scope: 'personal' }))}
                  sx={{ minWidth: 0, px: 1.25 }}>
                  Pessoal
                </Button>
                <Button
                  variant={createForm.scope === 'general' ? 'contained' : 'outlined'}
                  onClick={() => setCreateForm((prev) => ({ ...prev, scope: 'general' }))}
                  sx={{ minWidth: 0, px: 1.25 }}>
                  Geral
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                `Pessoal` aparece só para você. `Geral` fica visível para todos.
              </Typography>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 1.25,
              py: 1,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
            }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>Fixar no topo</Typography>
                <Typography variant="caption" color="text.secondary">
                  Ideal para avisos que precisam ficar sempre à vista.
                </Typography>
              </Box>
              <Switch
                checked={createForm.pinned}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, pinned: event.target.checked }))}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={closeCreateModal}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar anotação'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingNote)}
        onClose={() => {
          setEditingNote(null);
          setEditError('');
        }}
        fullWidth
        maxWidth="sm">
        <DialogTitle>Editar anotação</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Título"
              size="small"
              value={editForm.title}
              onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Conteúdo"
              multiline
              minRows={5}
              value={editForm.content}
              onChange={(event) => setEditForm((prev) => ({ ...prev, content: event.target.value }))}
              fullWidth
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Cor do post-it
              </Typography>
              {renderColorSelector(editForm.color, (color) => setEditForm((prev) => ({ ...prev, color })))}
              {isAdmin && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Cobalto e Terracota sao cores exclusivas para administradores.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Visibilidade
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant={editForm.scope === 'personal' ? 'contained' : 'outlined'}
                  onClick={() => setEditForm((prev) => ({ ...prev, scope: 'personal' }))}
                  sx={{ minWidth: 0, px: 1.25 }}>
                  Pessoal
                </Button>
                <Button
                  variant={editForm.scope === 'general' ? 'contained' : 'outlined'}
                  onClick={() => setEditForm((prev) => ({ ...prev, scope: 'general' }))}
                  sx={{ minWidth: 0, px: 1.25 }}>
                  Geral
                </Button>
              </Stack>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.25,
              py: 1,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
            }}>
              <Typography variant="body2" fontWeight={600}>Fixar no topo</Typography>
              <Switch
                checked={editForm.pinned}
                onChange={(event) => setEditForm((prev) => ({ ...prev, pinned: event.target.checked }))}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setEditingNote(null);
              setEditError('');
            }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(noteToDelete)} onClose={() => setNoteToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Excluir anotação</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Essa anotação será removida permanentemente. Use essa ação apenas quando ela não for mais necessária.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setNoteToDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={saving}>
            {saving ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
