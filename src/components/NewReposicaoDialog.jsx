import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Alert,
  FormHelperText,
} from '@mui/material';
import {
  api,
  STATUS_CONFIG,
  DIAS,
  CATEGORIA_CONFIG,
  getErrorMessage,
  buildHorarioLabel,
  inferDiaFromDateValue,
} from '../services/api';

const EMPTY = {
  nome: '',
  obs: '',
  data: '',
  hora: '',
  horarioDetalhe: '',
  status: 'PENDENTE',
  categoria: 'GERAL',
  dia: 'SEGUNDA',
};

export default function NewReposicaoDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setError('');
      setSaving(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!form.nome.trim()) {
      setError('Nome do aluno é obrigatório.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const diaResolvido = inferDiaFromDateValue(form.data) || form.dia;
      const payload = {
        nome: form.nome,
        obs: form.obs,
        horario: buildHorarioLabel({
          date: form.data,
          time: form.hora,
          details: form.horarioDetalhe,
        }),
        status: form.status,
        categoria: form.categoria,
        dia: diaResolvido,
      };

      const item = await api.create(payload);
      onCreated(item);
      setForm(EMPTY);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao criar. Verifique o servidor.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Nova Reposição</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nome do Aluno *"
            value={form.nome}
            onChange={(event) => setForm({ ...form, nome: event.target.value })}
            size="small"
            fullWidth
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Data"
              type="date"
              value={form.data}
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
              value={form.hora}
              onChange={(event) => setForm({ ...form, hora: event.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <TextField
            label="Complemento de horário"
            value={form.horarioDetalhe}
            onChange={(event) => setForm({ ...form, horarioDetalhe: event.target.value })}
            size="small"
            fullWidth
            placeholder="Ex: sala, turno, observação curta"
          />

          <TextField
            label="Observação"
            value={form.obs}
            onChange={(event) => setForm({ ...form, obs: event.target.value })}
            size="small"
            fullWidth
            multiline
            rows={2}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Dia</InputLabel>
            <Select
              value={form.dia}
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
              value={form.categoria}
              label="Categoria"
              onChange={(event) => setForm({ ...form, categoria: event.target.value })}>
              {Object.keys(CATEGORIA_CONFIG).map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={form.status}
              label="Status"
              onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancelar</Button>
        <Button onClick={handleCreate} variant="contained" size="small" disabled={saving}>
          {saving ? 'Criando...' : 'Criar Reposição'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
