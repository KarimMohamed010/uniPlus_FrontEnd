import React, { useState,useEffect  } from 'react';
import {
    Typography,
    Box,
    Card,
    CardContent,
    CardActions,
    Button,
    CircularProgress,
    Grid
} from '@mui/material';
import ShowQRButton from '../../components/ShowQrButton';
import { Add } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
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
import { useAuth  } from '../../context/AuthContext';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';


function stringToColor(string: string) {
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

function stringAvatar(name: string) {
  if (!name) {
    return {
      sx: {
        bgcolor: stringToColor("?"),
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
        leaderId: number;
    };
    basePrice: number;
}




export default function EventsList() {
    const { user } = useAuth();
    // STATE TO TRACK REGISTRATION FOR EACH EVENT
    const [registeredEvents, setRegisteredEvents] = useState<Record<number, boolean>>({});
    const [deletingId, setDeletingId] = useState<number | null>(null);
    

    const queryClient = useQueryClient(); 

    const { data: events, isLoading } = useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: async () => {
            const res = await client.get('/events');
            
            return res.data.events;
        }
    });


interface RegisteredEvent {
        eventId: number;
        event: {
            id: number;
            title: string;
            
        };
    }
// to get the data for the registiration button
    const { data: userRegisteredEvents, isLoading: isLoadingRegistrations } = useQuery<RegisteredEvent[]>({
    queryKey: ['user-registered-events'],
    queryFn: async () => {
        try {
            console.log('Fetching all registered events...');
            const res = await client.get('/tickets/my/registration');
            console.log('Registered events response:', res.data);
            return res.data.events || [];
        } catch (error) {
            console.error('Failed to fetch registered events:', error);
            return [];
        }
    }
});

// Update useEffect to handle the new data
useEffect(() => {
    if (userRegisteredEvents) {
        console.log('Processing registered events:', userRegisteredEvents);
        
        const initialRegisteredEvents: Record<number, boolean> = {};
        userRegisteredEvents.forEach(reg => {
            // The event ID might be in different places depending on your structure
            const eventId = reg.event?.id || reg.eventId;
            console.log(`Found registration for event ${eventId}:`, reg);
            
            if (eventId) {
                initialRegisteredEvents[eventId] = true;
            }
        });
        
        console.log('Final registration state:', initialRegisteredEvents);
        setRegisteredEvents(initialRegisteredEvents);
    }
}, [userRegisteredEvents]);
    
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
        const response = await client.delete(`/events/${eventId}/cancel`);
        
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
    

    // state to remove the event
    
    const handleDelete = async (eventId: number) => {
        setDeletingId(eventId);
        try {
            await client.delete(`/events/${eventId}`);
            // 3. THIS IS THE MAGICAL PART (Instant Update)
            // It manually filters the event out of the list so it vanishes instantly
            queryClient.setQueryData(['events'], (oldEvents: Event[] | undefined) => {
                return oldEvents ? oldEvents.filter(e => e.id !== eventId) : [];
            });
            // Optional: Double check with server
            queryClient.invalidateQueries({ queryKey: ['events'] });
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete event");
        } finally {
            setDeletingId(null);
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

            <Grid container spacing={3} >
                {events?.map((event) => {
                    // old events can't register to them any more
                    const isEventOver = new Date(event.startTime) < new Date();
                    // Check if this specific event is registered
                    const isRegistered = !!registeredEvents[event.id];
                    
                    
                    return (
                        <Grid size="auto" key={event.id}>
                            <Card sx={{display:'flex', maxWidth:'620px'}} >
                                <CardMedia component="div" sx={{  backgroundColor:'gold',width:'120px',display: 'flex',flexDirection: 'column',justifyContent: 'center',p: 2.5,textAlign: 'center' }}>
                                    <Typography variant="h4" sx={{ fontWeight: 700,textTransform: 'uppercase' }}>
                                        {format(new Date(event.startTime), 'dd MMM yyyy')}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 500,textTransform: 'uppercase' }}>
                                        {format(new Date(event.startTime), 'HH:mm')}
                                    </Typography>
                                </CardMedia>
                                <CardContent >
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
                                        {/** Delete button for user and Admins */}
                                        {(event.team?.leaderId == user?.id || user?.roles?.global === 'admin') &&       <Button variant="outlined" color="error" size='small'  onClick={() => handleDelete(event.id)}>Delete</Button> }
                                        
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
                                <Box display={'flex'} justifyContent={'space-between'} sx={{alignItems:'center', mb:2}}>
                                    {isEventOver == false  && <Button 
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
                                    </Button>}
                                    { isRegistered && <ShowQRButton value={ JSON.stringify({eventId : event.id , studentId: user.id}) } /> }
                
                                </Box>

                                { isRegistered == true && isEventOver == true &&<RateEvent eventId={event.id}/>}
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

            
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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

function RateEvent({ eventId }: { eventId: number }) {
    const [rating, setRating] = useState<number | null>(0);
    const [feedback, setFeedback] = useState("");
    const [submitted, setSubmitted] = useState(false);

    // FETCH EXISTING RATING
    useQuery({
        queryKey: ['my-ticket', eventId],
        queryFn: async () => {
            try {
                // I fixed this route for you in the backend!
                const res = await client.get(`/tickets/event/${eventId}`);
                const ticket = res.data.ticket;
                
                if (ticket && ticket.rating) {
                    setRating(ticket.rating);
                    setFeedback(ticket.feedback || "");
                    setSubmitted(true); // Don't allow double rating if you want
                }
                return ticket;
            } catch (e) {
                return null; // No ticket found
            }
        },
        retry: false
    });

    const handleSubmit = async () => {
        
        
        try {
            await client.post('/tickets/rate', {
                eventId: eventId,
                rating: rating,
                feedback: feedback
            });
            setSubmitted(true);
            
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || "Failed to submit");
        }
    };

    return (
        <Box sx={{ display: 'flex', mt: 2, alignItems: 'center', gap: 3 }}>
            <Rating
                value={rating}
                onChange={(event, newValue) => setRating(newValue)}
                readOnly={submitted} // Make it read-only if they already rated
            />
            {!submitted && (
                <>
                    <TextField 
                        label="Feedback" 
                        variant="standard" 
                        size='small' 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                    <Button size="small" onClick={handleSubmit}>Submit</Button>
                </>
            )}
            {submitted && <Typography variant="caption" color="success.main">Thanks for rating!</Typography>}
        </Box>
    );
}