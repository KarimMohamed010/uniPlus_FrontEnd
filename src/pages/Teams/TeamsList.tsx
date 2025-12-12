import React, { useState } from 'react';
import { 
    Typography, 
    Box, 
    Paper, 
    Card, 
    CardContent, 
    CardActions, 
    Button,
    Grid,
    CircularProgress,
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface Team {
    id: number;
    name: string;
    description: string;
    acceptanceStatus: string;
}

const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type CreateTeamData = z.infer<typeof createTeamSchema>;

export default function TeamsList() {
  const [openCreate, setOpenCreate] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
        const res = await client.get('/teams');
        return res.data;
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTeamData>({
      resolver: zodResolver(createTeamSchema)
  });

  const createMutation = useMutation({
      mutationFn: async (data: CreateTeamData) => {
          return await client.post('/teams', data);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['teams'] });
          setOpenCreate(false);
          reset();
      }
  });

  const handleCreate = (data: CreateTeamData) => {
      createMutation.mutate(data);
  };

  if (isLoading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Teams</Typography>
        <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setOpenCreate(true)}
        >
            Create Team
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {teams?.map((team) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" component="div">
                            {team.name}
                        </Typography>
                        <Typography sx={{ mb: 1.5 }} color="text.secondary">
                            Status: {team.acceptanceStatus}
                        </Typography>
                        <Typography variant="body2">
                            {team.description}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button size="small">View Details</Button>
                    </CardActions>
                </Card>
            </Grid>
        ))}
        {teams?.length === 0 && (
            <Typography sx={{ mt: 2, ml: 2 }} color="text.secondary">No teams found.</Typography>
        )}
      </Grid>

      {/* Create Team Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogContent>
              <TextField 
                margin="dense"
                label="Team Name"
                fullWidth
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField 
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                {...register('description')}
              />
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
              <Button onClick={handleSubmit(handleCreate)} variant="contained" disabled={createMutation.isPending}>
                  Create
              </Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
}
