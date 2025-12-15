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
    Grid
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CancelIcon from '@mui/icons-material/Cancel';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Rating from '@mui/material/Rating';

function stringToColor(string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

function stringAvatar(name) {
  if (!name) {
    return {
      sx: {
        bgcolor: stringToColor(name),
      },
      children: '?',
    };
  }
  
  const nameParts = name.split(' ');
  const firstNameInitial = nameParts[0]?.[0] || '';
  const lastNameInitial = nameParts[1]?.[0] || '';
  
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${firstNameInitial}${lastNameInitial}`.toUpperCase(),
  };
}

interface Event {
    id: number;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    type: string;
    acceptanceStatus: string;
    team: {
        id: number;
        name: string;
    };
    basePrice: number;
}

const createEventSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    type: z.string().min(1, 'Type is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    teamId: z.coerce.number().min(1, 'Team ID is required'),
});

type CreateEventData = z.infer<typeof createEventSchema>;

export default function EventsList() {
    const [openCreate, setOpenCreate] = useState(false);
    const queryClient = useQueryClient();
    const [value, setValue] = React.useState();
    // STATE TO TRACK REGISTRATION FOR EACH EVENT
    const [registeredEvents, setRegisteredEvents] = useState<Record<number, boolean>>({});

    const { data: events, isLoading } = useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: async () => {
            const res = await client.get('/events');
            return res.data.events;
        }
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateEventData>({
        resolver: zodResolver(createEventSchema) as any
    });

    const createMutation = useMutation({
        mutationFn: async (data: CreateEventData) => {
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
    
    // HANDLE REGISTRATION FOR A SPECIFIC EVENT
    const handleRegister = async (eventId: number) => {
    try {
        // Call the registration API
        const response = await client.post('/tickets/register', {
            eventId: eventId,
            // studentId should come from auth context/token
        });
        
        // Update local state
        setRegisteredEvents(prev => ({
            ...prev,
            [eventId]: true
        }));
        
        // Show success message
        showSnackbar('Successfully registered for the event!', 'success');
        // You could add a toast/snackbar here
        
    } catch (error: any) {
        console.error('Registration failed:', error);
        
        // Show error message
        if (error.response?.status === 401) {
            alert('Please login to register for events');
        } else if (error.response?.status === 400) {
            alert('Already registered for this event');
        } else {
            alert('Registration failed. Please try again.');
        }
    }
};

    const handleCancel = async (eventId: number) => {
    try {
        // Call the cancel registration API
        const response = await client.delete(`/tickets/${eventId}/cancel`);
        
        // Update local state
        setRegisteredEvents(prev => ({
            ...prev,
            [eventId]: false
        }));
        showSnackbar('Registration cancelled ', 'warning');
    } catch (error: any) {
        console.error('Cancellation failed:', error);
        
        // Show error message
        if (error.response?.status === 401) {
            alert('Please login to cancel registration');
        } else if (error.response?.status === 404) {
            alert('Registration not found');
        } else if (error.response?.status === 400) {
            alert('Cannot cancel registration');
        } else {
            alert('Cancellation failed. Please try again.');
        }
    }
};
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'warning'
    });

const showSnackbar = (message: string, severity: 'success' | 'warning') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
    }

    const [eventRatings, setEventRatings] = useState<Record<number, number | null>>({});

  const handleRatingSubmit = async (eventId: number, rating: number | null) => {
        if (rating === null) return;
        
        try {
            // Make API call to save the rating
            await client.post('/tickets/rate', {
                eventId: eventId,
                rating: Math.floor(rating),
                feedback: null // You might want to make this dynamic
            });
            showSnackbar('Rating saved!', 'success');
        } catch (error) {
            console.error('Failed to save rating:', error);
            showSnackbar('Failed to save rating', 'warning');
        }
    };

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
                {events?.map((event) => {
                    // Check if this specific event is registered
                    const isRegistered = !!registeredEvents[event.id];
                    const rateValue = eventRatings[event.id] || 0;
                    
                    return (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={event.id}>
                            <Card sx={{display:'flex', maxWidth:'600px'}} >
                                <CardMedia component="div" sx={{  backgroundColor:'gold',width:'140px',display: 'flex',flexDirection: 'column',justifyContent: 'center',p: 2.5,textAlign: 'center' }}>
                                    <Typography variant="h4" sx={{ fontWeight: 700,textTransform: 'uppercase' }}>
                                        {format(new Date(event.startTime), 'dd MMM yyyy')}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 500,textTransform: 'uppercase' }}>
                                        {format(new Date(event.startTime), 'HH:mm')}
                                    </Typography>
                                </CardMedia>
                                <CardContent sx={{ flex: 1, p: { xs: 2, sm: 3 } }}>
                                    <Box sx={{display: 'flex',gap: 2,alignItems: 'center', marginBottom:'15px'}}>
                                        {event.team?.name && (
                                            <Tooltip title={event.team.name}>
                                                <Chip avatar={<Avatar 
                                                    {...stringAvatar(event.team.name)}
                                                    sx={{ 
                                                        width: 40, 
                                                        height: 40,
                                                        boxShadow: 1,
                                                        transition: 'transform 0.2s',
                                                        '&:hover': { transform: 'scale(1.05)' }
                                                    }} 
                                                /> } label={event.team.name} sx={{fontWeight:550}}/>
                                            </Tooltip>
                                        )}
                                        
                                        <Typography 
                                            variant="h5" 
                                            sx={{ flexGrow: 1,fontWeight: 600,color: 'text.primary',overflow: 'hidden',textOverflow: 'ellipsis',whiteSpace: 'nowrap'}}
                                        >
                                            {event.title}
                                        </Typography>
                                        <Chip label={event.type} sx={{backgroundColor:event.type === 'offline' ? '#EC4899' :'#818CF8', color:'white', fontWeight:550}}/>
                                    </Box>
                                    
                                    <Typography variant='h6'>Price: {event.basePrice}</Typography>
                                    
                                    <Divider sx={{marginBottom:'15px'}}/>
                                    
                                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}aria-controls="panel1-content" id="panel1-header">
                                            <Typography component="span" sx={{fontWeight:550}}>Details</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography variant='h5'>This event is organized by: {event.team.name}</Typography>
                                            <Divider sx={{marginBottom:'15px'}}/>
                                            <Typography variant='body2'>{event.description}</Typography>
                                            <Divider sx={{marginBottom:'15px', mt:'15px'}}/>
                                            <SpeakerDisplay  eventId={event.id}/> 
                                            <Divider sx={{marginBottom:'15px', mt:'15px'}}/>
                                            <Typography variant='body2'>Event's date: <span style={{fontWeight:'bold'}}>
                                                {format(new Date(event.startTime), 'dd-MM-yyyy , HH:mm') } - {format(new Date(event.endTime), 'HH:mm')}
                                            </span></Typography>
                                            <EventRoom eventId={event.id}/>
                                        </AccordionDetails> 
                                    </Accordion>
                                    
                                    {/* Each button uses the event-specific isRegistered state */}
                                <Box display={'flex'} justifyContent={'space-between'}>
                                    <Button 
                                        variant={isRegistered ? "outlined" : "contained"}
                                        color={isRegistered ? "error" : "primary"}
                                        endIcon={isRegistered ? <CancelIcon /> : <HowToRegIcon />}
                                        onClick={() => isRegistered ? handleCancel(event.id) : handleRegister(event.id)}
                                        sx={{ 
                                            mt: 2,
                                            minWidth: 120,
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        {isRegistered ? "Cancel" : "Register"}
                                    </Button>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                                            
                                    </Box>
                                </Box>
                                </CardContent>
                                <CardActions>
                                    {/* Optional actions */}
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
                
                {events?.length === 0 && (
                    <Typography sx={{ mt: 2, ml: 2 }} color="text.secondary">
                        No events found.
                    </Typography>
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
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}


interface Speaker {
    id: number;
    name: string;
    bio: string;
    fname: string;
    lname: string;
    contact: number;
    email: string;
}

interface SpeakerDisplayProps {
    eventId: number;
}

function SpeakerDisplay({ eventId }: SpeakerDisplayProps) {
    const { data: speakers, isLoading } = useQuery<Speaker[]>({
        queryKey: ['speak', eventId],
        queryFn: async () => {
            const res = await client.get(`/events/${eventId}/speakers`);
            return res.data.speakers; 
        },
        enabled: !!eventId,
    });

    if (isLoading) {
        return <CircularProgress size={16} />;
    }

    if (!speakers || speakers.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                No speakers
            </Typography>
        );
    }

    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600, mr: 1 }}>
                Speakers:
            </Typography>
            {speakers.map((speaker) => (
                <Box key={speaker.id}>
                    <Chip
                        label={speaker.name}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        variant="outlined"
                    />
                    <Typography variant='body2'>
                        <Typography variant='subtitle2' component="span">Introduction:</Typography> {speaker.bio}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

interface Room {
    id: number;
    name: string;
    location: string;
    capacity: number;
}

interface RoomDisplayProps {
    eventId: number;
}

function EventRoom({ eventId }: RoomDisplayProps) {
    const { data: room, isLoading } = useQuery<Room>({
        queryKey: ['room', eventId],
        queryFn: async () => {
            const res = await client.get(`/events/${eventId}/room`);
            return res.data.room; 
        },
        enabled: !!eventId,
    });

    if (isLoading) {
        return <CircularProgress size={16} />;
    }

    if (!room) {
        return (
            <Typography variant="subtitle2" color="text.secondary">
                The event is Online.
            </Typography>
        );
    }
    
    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant='body2'>Location: <span style={{fontWeight:'bold'}}>{room.location}</span></Typography>
            <Typography variant='body2'>Room: <span style={{fontWeight:'bold'}}>{room.name}</span></Typography>
        </Box>
    );
}