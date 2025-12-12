import React from 'react';
import { Typography, Box, Paper, Grid } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.fname}!
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        This is your dashboard. You are logged in as a <strong>{user?.roles.global}</strong>.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Stats</Typography>
                <Typography variant="h3" color="primary">0</Typography>
                <Typography variant="body2">Active Teams</Typography>
            </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
             <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Upcoming Events</Typography>
                <Typography variant="body2">No events scheduled.</Typography>
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
