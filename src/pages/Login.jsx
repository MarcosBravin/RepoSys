import React, { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Stack,
  TextField, Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getColors } from '../theme/theme';

export default function Login({ onSubmit, loading, error }) {
  const theme = useTheme();
  const COLORS = getColors(theme.palette.mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      background: theme.palette.mode === 'dark'
        ? 'radial-gradient(circle at top, rgba(30,107,196,0.18), transparent 35%), linear-gradient(180deg, #08111f 0%, #0A0E1A 100%)'
        : 'radial-gradient(circle at top, rgba(30,107,196,0.10), transparent 35%), linear-gradient(180deg, #F7FAFF 0%, #EDF4FB 100%)',
    }}>
      <Card sx={{ width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <Box sx={{
          px: 3,
          py: 3,
          borderBottom: `1px solid ${COLORS.border}`,
          background: 'linear-gradient(135deg, rgba(30,107,196,0.18), rgba(0,180,216,0.08))',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: COLORS.surfaceAlt,
            }}>
              <Box
                component="img"
                src="/logo.png"
                alt="RepoSys"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scale(1.22)',
                }}
              />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>RepoSys</Typography>
              <Typography variant="body2" color="text.secondary">Acesso seguro ao sistema</Typography>
            </Box>
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                size="small"
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={loading} size="large">
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
