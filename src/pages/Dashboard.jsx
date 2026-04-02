import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  TablePagination,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DescriptionIcon from '@mui/icons-material/Description';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { getColors } from '../theme/theme';
import { normalizeDiaLabel } from '../services/api';

function StatCard({ icon, label, value, color, sub }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: color + '22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 20 } })}
          </Box>
          <Typography variant="h4" fontWeight={700} color={color} sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
            {value}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function BarSegment({ label, value, total, color, colors }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" color="text.primary" fontWeight={600} sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
          {value} <span style={{ color: colors.textMuted }}>({pct.toFixed(0)}%)</span>
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: color + '20',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

const CAT_COLORS = {
  'COMPLEMENTAÇÃO': '#60A5FA',
  'TEM DOCUMENTO': '#34D399',
  AGUARDANDO: '#F59E0B',
  'AGUARDANDO DOC': '#FB923C',
  ESCALA: '#A78BFA',
  'NÃO CONTATAR': '#EF4444',
  GERAL: '#94A3B8',
};

const DIA_COLORS = {
  SÁBADO: '#A78BFA',
  SEGUNDA: '#60A5FA',
  TERÇA: '#34D399',
  QUARTA: '#F59E0B',
  QUINTA: '#FB923C',
  SEXTA: '#F472B6',
  EXTRA: '#94A3B8',
};

export default function Dashboard({ stats, activityFeed }) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const [activityPage, setActivityPage] = useState(0);
  const activityRowsPerPage = 5;

  const ACTIVITY_ICONS = {
    CREATE: { icon: <TrendingUpIcon />, color: COLORS.sim },
    UPDATE: { icon: <TaskAltIcon />, color: COLORS.secondary },
    DELETE: { icon: <DescriptionIcon />, color: '#EF4444' },
    LOGIN: { icon: <CheckCircleIcon />, color: COLORS.primaryLight },
    USER_CREATE: { icon: <CheckCircleIcon />, color: COLORS.secondary },
    USER_UPDATE: { icon: <TaskAltIcon />, color: COLORS.pendente },
    SYSTEM: { icon: <FiberManualRecordIcon />, color: COLORS.textMuted },
  };

  const recentActivity = useMemo(() => activityFeed || [], [activityFeed]);
  const paginatedActivity = recentActivity.slice(
    activityPage * activityRowsPerPage,
    activityPage * activityRowsPerPage + activityRowsPerPage
  );

  if (!stats) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Visão geral das reposições e atividade operacional
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
          width: '100%',
        }}>
        <StatCard icon={<TrendingUpIcon />} label="Total de reposições" value={stats.total} color={COLORS.primaryLight} sub="registros ativos" />
        <StatCard icon={<CheckCircleIcon />} label="Confirmadas" value={stats.confirmadas} color={COLORS.sim} sub="aguardando execução" />
        <StatCard icon={<TaskAltIcon />} label="Concluídas" value={stats.concluidas} color="#60A5FA" sub="lançadas no sistema" />
        <StatCard icon={<HourglassEmptyIcon />} label="Pendentes" value={stats.pendentes} color="#F59E0B" sub="aguardando confirmação" />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'repeat(3, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 2 },
          width: '100%',
          alignItems: 'start',
        }}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={2} color="text.primary">
              Distribuição por Dia
            </Typography>
            {Object.entries(stats.porDia || {}).map(([dia, count]) => (
              <BarSegment
                key={dia}
                label={normalizeDiaLabel(dia)}
                value={count}
                total={stats.total}
                color={DIA_COLORS[dia] || '#94A3B8'}
                colors={COLORS}
              />
            ))}
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={2} color="text.primary">
              Por Categoria
            </Typography>
            {Object.entries(stats.porCategoria || {}).map(([cat, count]) => (
              <BarSegment
                key={cat}
                label={cat}
                value={count}
                total={stats.total}
                color={CAT_COLORS[cat] || '#94A3B8'}
                colors={COLORS}
              />
            ))}
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ p: 2.5, pb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5} color="text.primary">
              Atividade Recente
            </Typography>

            <List dense disablePadding>
              {paginatedActivity.map((item, index) => {
                const cfg = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.SYSTEM;
                const actorLabel = item.userName || (item.type === 'SYSTEM' ? 'Sistema' : 'Usuário');
                return (
                  <React.Fragment key={item.id || index}>
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {React.cloneElement(cfg.icon, { sx: { fontSize: 14, color: cfg.color } })}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.message}
                        secondary={`${actorLabel} • ${new Date(item.timestamp).toLocaleString('pt-BR')}`}
                        primaryTypographyProps={{ fontSize: '0.75rem', color: 'text.primary' }}
                        secondaryTypographyProps={{ fontSize: '0.65rem', fontFamily: '"IBM Plex Mono", monospace' }}
                      />
                    </ListItem>
                    {index < paginatedActivity.length - 1 && <Divider sx={{ borderColor: COLORS.border }} />}
                  </React.Fragment>
                );
              })}

              {recentActivity.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Nenhuma atividade registrada ainda.
                </Typography>
              )}
            </List>

            {recentActivity.length > activityRowsPerPage && (
              <TablePagination
                component="div"
                count={recentActivity.length}
                page={activityPage}
                onPageChange={(_, nextPage) => setActivityPage(nextPage)}
                rowsPerPage={activityRowsPerPage}
                rowsPerPageOptions={[activityRowsPerPage]}
                labelRowsPerPage=""
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                sx={{
                  mt: 1,
                  borderTop: `1px solid ${COLORS.border}`,
                  '& .MuiTablePagination-toolbar': { px: 0, minHeight: 40 },
                  '& .MuiTablePagination-spacer': { display: 'none' },
                  '& .MuiTablePagination-selectLabel': { display: 'none' },
                  '& .MuiTablePagination-select': { display: 'none' },
                }}
              />
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
