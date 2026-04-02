import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Chip, LinearProgress, Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { api, CATEGORIA_CONFIG, getErrorMessage, normalizeDiaLabel, DIAS } from '../services/api';
import { getColors } from '../theme/theme';
import StatusChip from '../components/StatusChip';
import DetailDrawer from '../components/DetailDrawer';

const DIAS_ORDER = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
const DIA_COLORS = {
  SÁBADO: '#A78BFA',
  SEGUNDA: '#60A5FA',
  TERÇA: '#34D399',
  QUARTA: '#F59E0B',
  QUINTA: '#FB923C',
  SEXTA: '#F472B6',
};

function groupItems(items) {
  const grouped = {};
  DIAS_ORDER.forEach((day) => { grouped[day] = []; });

  items.forEach((item) => {
    const normalizedDia = normalizeDiaLabel(item.dia, item.horario);
    const key = DIAS_ORDER.includes(normalizedDia) ? normalizedDia : DIAS[0];
    grouped[key].push(item);
  });

  return grouped;
}

function ReposicaoCard({ item, onClick, colors }) {
  const catCfg = CATEGORIA_CONFIG[item.categoria] || CATEGORIA_CONFIG.GERAL;
  const secondaryText = [item.horario, item.obs].filter(Boolean).join(' • ');

  return (
    <Box
      onClick={() => onClick(item)}
      sx={{
        p: 1.25, mb: 0.75, borderRadius: 1.5,
        background: `linear-gradient(135deg, ${colors.surfaceAlt}, ${colors.surface})`,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: catCfg.color + '66',
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${catCfg.color}22`,
        },
        borderLeft: `3px solid ${catCfg.color}`,
        minHeight: 108,
      }}>
      <Typography variant="body2" fontWeight={600} color="text.primary" noWrap sx={{ fontSize: '0.78rem', mb: 0.4 }}>
        {item.nome}
      </Typography>
      {secondaryText && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '0.65rem',
            display: '-webkit-box',
            mb: 0.6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            lineHeight: 1.45,
            minHeight: '2.85em',
          }}>
          {secondaryText}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
        <StatusChip status={item.status} size="small" />
        <Chip
          size="small"
          label={item.categoria}
          sx={{ fontSize: '0.6rem', height: 16, px: 0, bgcolor: catCfg.color + '22', color: catCfg.color }}
        />
      </Box>
    </Box>
  );
}

export default function Agenda({ realtimeUpdates, permissions }) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await api.getAll();
      setData(groupItems(items));
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar a agenda.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!realtimeUpdates) return;
    load();
  }, [realtimeUpdates]);

  const handleSave = (updated) => {
    setData((prev) => {
      const flattened = Object.values(prev).flat().filter((item) => item.id !== updated.id);
      return groupItems([...flattened, updated]);
    });
    setSelected(updated);
  };

  const handleDelete = (id) => {
    setData((prev) => {
      const flattened = Object.values(prev).flat().filter((item) => item.id !== id);
      return groupItems(flattened);
    });
    setSelected(null);
  };

  if (loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">Agenda Semanal</Typography>
        <Typography variant="body2" color="text.secondary">
          Visualize e gerencie reposições por dia da semana
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {Object.entries(CATEGORIA_CONFIG).map(([cat, cfg]) => (
          <Chip
            key={cat}
            size="small"
            label={cat}
            sx={{ fontSize: '0.65rem', bgcolor: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}
          />
        ))}
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(6, minmax(220px, 1fr))',
          md: `repeat(${DIAS_ORDER.length}, minmax(160px, 1fr))`,
        },
        gap: 1.5,
        overflowX: 'auto',
        pb: 2,
      }}>
        {DIAS_ORDER.map((dia) => {
          const items = data[dia] || [];
          const diaColor = DIA_COLORS[dia] || '#94A3B8';
          return (
            <Box key={dia}>
              <Box sx={{
                p: 1.5, mb: 1, borderRadius: 1.5,
                background: `linear-gradient(135deg, ${diaColor}22, ${diaColor}11)`,
                border: `1px solid ${diaColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color={diaColor} sx={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    {dia}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    {items.length} reposição{items.length !== 1 ? 'ões' : ''}
                  </Typography>
                </Box>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: diaColor + '33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography variant="caption" fontWeight={700} color={diaColor} sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.7rem' }}>
                    {items.length}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ minHeight: 200 }}>
                {items.length === 0 ? (
                  <Box sx={{
                    height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px dashed ${COLORS.border}`, borderRadius: 1.5,
                  }}>
                    <Typography variant="caption" color="text.secondary">Sem reposições</Typography>
                  </Box>
                ) : items.map((item) => (
                  <ReposicaoCard key={item.id} item={item} onClick={setSelected} colors={COLORS} />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      <DetailDrawer item={selected} onClose={() => setSelected(null)} onSave={handleSave} onDelete={handleDelete} permissions={permissions} />
    </Box>
  );
}
