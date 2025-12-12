import React, { useState } from 'react';
import { 
    Typography, 
    Box, 
    Card, 
    CardContent, 
    CardActions, 
    Button,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    MenuItem,
    Grid
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

interface Event {
    id: number;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    type: string;
    acceptanceStatus: string;
}

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  startTime: z.string().min(1, 'Start time is required'), // Should authenticate date format
  endTime: z.string().min(1, 'End time is required'),
  teamId: z.coerce.number().min(1, 'Team ID is required'), // Temporary: enter ID manually or select from dropdown
});

type CreateEventData = z.infer<typeof createEventSchema>;

export default function EventsList() {
  const [openCreate, setOpenCreate] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
        const res = await client.get('/events');
        return res.data.events;
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateEventData>({
      resolver: zodResolver(createEventSchema) as any // Bypass strict inference mismatch for coerced number
  });

  const createMutation = useMutation({
      mutationFn: async (data: CreateEventData) => {
          // Ideally format dates to ISO string if used Datetime picker
          const payload = {
              ...data,
              startTime: new Date(data.startTime).toISOString(),
              endTime: new Date(data.endTime).toISOString()
          };
          return await client.post('/events', payload);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
          setOpenCreate(false);
          reset();
      },
      onError: (error) => {
          console.error(error);
          alert('Failed to create event. Make sure you are an organizer and entered a valid Team ID.');
      }
  });

  const handleCreate = (data: CreateEventData) => {
      createMutation.mutate(data);
  };

  if (isLoading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Events</Typography>
        <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setOpenCreate(true)}
        >
            Create Event
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {events?.map((event) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={event.id}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" component="div">
                            {event.title}
                        </Typography>
                         <Typography color="text.secondary" gutterBottom>
                            {format(new Date(event.startTime), 'PPP p')}
                        </Typography>
                         <Typography variant="body2" color="text.secondary">
                            Type: {event.type}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {event.description}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Status: {event.acceptanceStatus}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button size="small">Details</Button>
                    </CardActions>
                </Card>
            </Grid>
        ))}
         {events?.length === 0 && (
            <Typography sx={{ mt: 2, ml: 2 }} color="text.secondary">No events found.</Typography>
        )}
      </Grid>

      {/* Create Event Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogContent>
              <TextField 
                margin="dense"
                label="Title"
                fullWidth
                {...register('title')}
                error={!!errors.title}
                helperText={errors.title?.message}
              />
              <TextField 
                margin="dense"
                label="Type"
                fullWidth
                {...register('type')}
                error={!!errors.type}
                helperText={errors.type?.message}
              />
              <TextField 
                margin="dense"
                label="Team ID"
                type="number"
                fullWidth
                {...register('teamId')}
                error={!!errors.teamId}
                helperText={errors.teamId?.message}
              />
              <TextField 
                margin="dense"
                label="Start Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('startTime')}
                error={!!errors.startTime}
                helperText={errors.startTime?.message}
              />
               <TextField 
                margin="dense"
                label="End Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('endTime')}
                error={!!errors.endTime}
                helperText={errors.endTime?.message}
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
