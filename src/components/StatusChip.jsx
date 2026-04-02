import React from 'react';
import { Box, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { STATUS_CONFIG } from '../services/api';

export default function StatusChip({ status, size = 'small' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['PENDENTE'];
  const icons = {
    SIM: <CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />,
    FEITO: <TaskAltIcon sx={{ fontSize: '0.85rem !important' }} />,
    PENDENTE: <HourglassEmptyIcon sx={{ fontSize: '0.85rem !important' }} />,
  };
  return (
    <Chip
      size={size}
      icon={icons[status] || icons['PENDENTE']}
      label={cfg.label}
      sx={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderColor: cfg.color + '44',
        border: '1px solid',
        '& .MuiChip-icon': { color: cfg.color },
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    />
  );
}
