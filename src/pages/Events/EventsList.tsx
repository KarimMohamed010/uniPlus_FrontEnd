import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    Card,
    CardContent,
    CardActions,
    Button,
    CircularProgress,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    FormHelperText
} from '@mui/material';
import ShowQRButton from '../../components/ShowQRButton';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
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


// --- ENHANCED & CRASH-PROOF COMPONENT ---
const TeamMemberGuard = ({ teamId, leaderId, children }: { teamId: number, leaderId: number, children: React.ReactNode }) => {
    const { user } = useAuth();
    const userId = user?.id;

    const { data: members = [], isLoading, isError } = useQuery({
        queryKey: ['teamMembers', teamId],
        queryFn: async () => {
            if (!teamId) return [];
            try {
                // Calls the backend function: getTeamMembers
                const res = await client.get(`/teams/${teamId}/members`);
                // Safely access properties
                return res.data?.members || [];
            } catch (error) {
                console.error("Error checking team membership", error);
                return []; // Return empty array on error so .some() doesn't crash
            }
        },
        enabled: !!teamId && !!userId,
        retry: 1,
        staleTime: 1000 * 60 * 5, // Keep data fresh for 5 mins
    });

    // 1. Loading: return null to hide button while checking
    if (isLoading) return null;

    // 2. Error/No User: Fail-safe by showing the button
    if (isError || !userId) return <>{children}</>;

    // 3. Logic: Check if Leader or Member
    const isLeader = userId === leaderId;
    
    // Ensure 'members' is an array before using array methods
    const safeMemberList = Array.isArray(members) ? members : [];
    const isMember = safeMemberList.some((m: any) => m.studentId === userId);

    if (isLeader || isMember) {
        return null; // Hide button
    }

    // 4. Default: Show button
    return <>{children}</>;
};
// ------------------------------------------------


export default function EventsList({ teamID = -1 }: { teamID?: number }) {
    const { user } = useAuth();
    // STATE TO TRACK REGISTRATION FOR EACH EVENT
    const [registeredEvents, setRegisteredEvents] = useState<Record<number, boolean>>({});
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // --- ADDED: State for Create Event Modal ---
    const [openCreate, setOpenCreate] = useState(false);
    const [newEventData, setNewEventData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        type: 'offline',
        basePrice: 0,
        speakerId: '',
        speakerId2: '',
        roomId: '' // Added roomName since backend doesn't return ID
    });
    // -------------------------------------------

    const queryClient = useQueryClient();

    const navigate = useNavigate();

    const { data: events, isLoading } = useQuery<Event[]>({
        queryKey: ['events', teamID],
        queryFn: async () => {
            if (teamID != -1) {
                // Case A: Fetch specific team events
                const res = await client.get(`/events/team/${teamID}`);
                return res.data.events;
            } else {
                // Case B: Fetch all events (Default)
                const res = await client.get('/events');
                return res.data.events;
            }
        }
    });

    // --- ADDED: Fetch Rooms for Dropdown ---
    const { data: rooms = [] } = useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            // Assuming the router is mounted at /events/rooms based on context
            // If it's just /rooms, remove the /events prefix
            const res = await client.get('/events/rooms'); 
            return res.data.rooms; 
        },
        enabled: openCreate // Only fetch when modal is open
    });
    // --------------------------------------
    const { data: speakers = [] } = useQuery({
        queryKey: ['speakers'],
        queryFn: async () => {
            const res = await client.get('/events/speakers'); 
            return res.data.speakers; 
        },
        enabled: openCreate // Only fetch when modal is open
    });
    // --------------------------------------
    // --- ADDED: Permission Check for Create Button ---
    const { data: permissions } = useQuery({
        queryKey: ['create-permissions', teamID, user?.id],
        queryFn: async () => {
            if (teamID === -1 || !user?.id) return { canCreate: false };
            try {
                // 1. Get Team Info for Leader
                const teamRes = await client.get(`/teams/${teamID}`);
                const leaderId = teamRes.data?.team?.leaderId;
                
                // 2. Get Members Info for Role
                const membersRes = await client.get(`/teams/${teamID}/members`);
                const members = membersRes.data?.members || [];
                const myMember = members.find((m: any) => m.studentId === user.id);

                const isLeader = leaderId === user.id;
                const isOrganizer = myMember?.role === 'organizer';

                return { canCreate: isLeader || isOrganizer };
            } catch (e) {
                return { canCreate: false };
            }
        },
        enabled: teamID !== -1 && !!user?.id
    });
    // -----------------------------------------------

    // --- ADDED: Mutation to Create Event ---
    
const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
        console.log('1. Raw data received in mutation:', data); // DEBUG
        
        // Build clean payload with proper types
        const payload: any = {
            title: data.title,
            description: data.description || '',
            startTime: data.startTime,
            endTime: data.endTime,
            type: data.type,
            basePrice: Number(data.basePrice) || 0,
            teamId: teamID,
            speakerId: Number(data.speakerId)
        };
        
        console.log('2. Base payload:', payload); // DEBUG
        
        // Only add optional fields if they have actual valid values
        if (data.speakerId2 && data.speakerId2 !== '' && data.speakerId2 !== '0') {
            const speaker2 = Number(data.speakerId2);
            console.log('3. Processing speaker2:', data.speakerId2, '-> number:', speaker2); // DEBUG
            if (speaker2 > 0) {
                payload.speakerId2 = speaker2;
            }
        }
        
        // Process roomId
        if (data.roomId && data.roomId !== '' && data.roomId !== '0') {
            const room = Number(data.roomId);
            console.log('4. Processing roomId:', data.roomId, '-> number:', room); // DEBUG
            if (room > 0) {
                payload.roomId = room;
                console.log('5. roomId ADDED to payload'); // DEBUG
            } else {
                console.log('5. roomId NOT added (not > 0)'); // DEBUG
            }
        } else {
            console.log('4. roomId skipped - value:', data.roomId); // DEBUG
        }
        
        console.log('6. Final payload being sent:', payload); // DEBUG
        return await client.post('/events', payload);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        setOpenCreate(false);
        setNewEventData({ 
            title: '', 
            description: '', 
            startTime: '', 
            endTime: '', 
            type: 'offline', 
            basePrice: 0, 
            speakerId: '',
            speakerId2: '',
            roomId: ''
        });
        showSnackbar('Event created successfully', 'success');
    },
    onError: (error: any) => {
        console.error('Full error object:', error);
        console.error('Response data:', error.response?.data);
        console.error('Validation details:', error.response?.data?.details);
        alert(error.response?.data?.message || error.response?.data?.error || 'Failed to create event');
    }
});
    // ---------------------------------------

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
            const response = await client.post('/tickets/register', {
                eventId: eventId,
                // studentId should come from auth context/token
            });

            // Update local state
            setRegisteredEvents(prev => ({
                ...prev,
                [eventId]: true
            }));

            
            showSnackbar('Successfully registered for the event!', 'success');
            

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
                alert('Cannot cancel registration after check-in');
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

    
const handleCreateEvent = () => {
    // 1. Validate Required Fields
    if (!newEventData.title.trim()) return alert("Title is required");
    if (!newEventData.startTime) return alert("Start Time is required");
    if (!newEventData.endTime) return alert("End Time is required");
    if (!newEventData.speakerId || newEventData.speakerId === '') return alert("Main Speaker is required");
    
    // 2. Validate Price
    if (newEventData.basePrice < 0) return alert("Price must be a positive number");
    
    // 3. Validate Room for Offline Events - FIX THIS CHECK
    if (newEventData.type === 'offline' && (!newEventData.roomId || newEventData.roomId === '' || newEventData.roomId === '0')) {
        return alert("Room is required for offline events");
    }
    
    // 4. Debug log before submitting
    console.log('Submitting event data:', newEventData);
    
    // 5. Submit
    createEventMutation.mutate(newEventData);
};

    return (
        <Box>
            {teamID == -1 && <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Events</Typography>

            </Box>}

            {/* --- ADDED: Create Event Button Section --- */}
            {teamID !== -1 && permissions?.canCreate && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" onClick={() => setOpenCreate(true)}>
                        Create Event
                    </Button>
                </Box>
            )}
            {/* ----------------------------------------- */}

            <Grid container spacing={3} >
                {events?.map((event) => {
                    // old events can't register to them any more
                    const isEventOver = new Date(event.startTime) < new Date();
                    // Check if this specific event is registered
                    const isRegistered = !!registeredEvents[event.id];


                    return (
                        <Grid size="auto" key={event.id}>
                            <Card sx={{ display: 'flex', maxWidth: '620px' }} >
                                <CardMedia component="div" sx={{ backgroundColor: 'gold', width: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 2.5, textAlign: 'center' }}>
                                    <Typography variant="h4" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                        {format(new Date(event.startTime), 'dd MMM yyyy')}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
                                        {format(new Date(event.startTime), 'HH:mm')}
                                    </Typography>
                                </CardMedia>
                                <CardContent >
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: '15px' }}>

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
                                                />} label={event.team.name} sx={{ fontWeight: 550 }} onClick={() => navigate(`/teams/${event.team.id}`)} />
                                            </Tooltip>
                                        )}

                                        <Typography
                                            variant="h5"
                                            sx={{ flexGrow: 1, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        >
                                            {event.title}
                                        </Typography>
                                        <Chip label={event.type} sx={{ backgroundColor: event.type === 'offline' ? '#EC4899' : '#818CF8', color: 'white', fontWeight: 550 }} />
                                        {/** Delete button for user and Admins */}
                                        {(event.team?.leaderId == user?.id || user?.roles?.global === 'admin') && <Button variant="outlined" color="error" size='small' onClick={() => handleDelete(event.id)}>Delete</Button>}

                                    </Box>
                                    {/**Here where I should put the price */}
                                    <EventPrice basePrice={event.basePrice} eventID={event.id} teamId={event.team.id} />
                                    <Divider sx={{ marginBottom: '15px' }} />

                                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header">
                                            <Typography component="span" sx={{ fontWeight: 550 }}>Details</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography variant='h5'>This event is organized by: {event.team.name}</Typography>
                                            <Divider sx={{ marginBottom: '15px' }} />
                                            <Typography variant='body2'>{event.description}</Typography>
                                            <Divider sx={{ marginBottom: '15px', mt: '15px' }} />
                                            <SpeakerDisplay eventId={event.id} />
                                            <Divider sx={{ marginBottom: '15px', mt: '15px' }} />
                                            <Typography variant='body2'>Event's date: <span style={{ fontWeight: 'bold' }}>
                                                {format(new Date(event.startTime), 'dd-MM-yyyy , HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                                            </span></Typography>
                                            <EventRoom eventId={event.id} />
                                        </AccordionDetails>
                                    </Accordion>

                                    {/* Each button uses the event-specific isRegistered state */}
                                    <Box display={'flex'} justifyContent={'space-between'} sx={{ alignItems: 'center', mb: 2 }}>
                                        
                                        {/* WRAPPED WITH ENHANCED TEAM MEMBER GUARD */}
                                        <TeamMemberGuard teamId={event.team.id} leaderId={event.team.leaderId}>
                                            {isEventOver == false && <Button
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
                                        </TeamMemberGuard>
                                        {/* END WRAPPER */}

                                    </Box>
                                    {isRegistered && <ShowQRButton value={JSON.stringify({ eventId: event.id, studentId: user?.id })} />}

                                    {isRegistered == true && isEventOver == true && <RateEvent eventId={event.id} />}
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

            {/* --- ADDED: Create Event Dialog --- */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create New Event</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Title"
                            fullWidth
                            value={newEventData.title}
                            onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={3}
                            value={newEventData.description}
                            onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Start Time"
                                type="datetime-local"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={newEventData.startTime}
                                onChange={(e) => setNewEventData({ ...newEventData, startTime: e.target.value })}
                            />
                            <TextField
                                label="End Time"
                                type="datetime-local"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={newEventData.endTime}
                                onChange={(e) => setNewEventData({ ...newEventData, endTime: e.target.value })}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={newEventData.type}
                                    label="Type"
                                    onChange={(e) => setNewEventData({ ...newEventData, type: e.target.value })}
                                >
                                    <MenuItem value="offline">Offline</MenuItem>
                                    <MenuItem value="online">Online</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Price"
                                type="number"
                                fullWidth
                                value={newEventData.basePrice}
                                onChange={(e) => setNewEventData({ ...newEventData, basePrice: Number(e.target.value) })}
                            />
                        </Box>
                        
                        
                        <FormControl fullWidth>
                            <InputLabel>Speaker</InputLabel>
                            <Select
                                value={newEventData.speakerId}
                                label="Speaker"
                                onChange={(e) => setNewEventData({ ...newEventData, speakerId: e.target.value })}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {speakers.map((speaker: any, index: number) => (
                                    <MenuItem key={index} value={speaker.id}>
                                        {speaker.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {speakers.length === 0 && <FormHelperText>Loading speakers...</FormHelperText>}
                        </FormControl>
                        {newEventData.type == 'offline' && <FormControl fullWidth>
                            <InputLabel>Room</InputLabel>
                            <Select
                                value={String(newEventData.roomId)} // <--- MUST match state variable
                                label="Room"
                                onChange={(e) => setNewEventData({ ...newEventData, roomId: e.target.value })} // <--- Updates roomId
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {rooms.map((room: any) => (
                                    <MenuItem key={room.id} value={String(room.id)}> {/* <--- Sends ID, not Name */}
                                        {room.name} ({room.location} - Cap: {room.capacity})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>}

                        {/* SPEAKER 2 SELECT BLOCK */}
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Speaker 2 (Optional)</InputLabel>
                            <Select
                                value={newEventData.speakerId2}
                                label="Speaker 2 (Optional)"
                                onChange={(e) => setNewEventData({ 
                                    ...newEventData, 
                                    speakerId2: e.target.value ? Number(e.target.value) : undefined // Convert to number or undefined
                                })}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {speakers.map((speaker: any) => (
                                    <MenuItem key={speaker.id} value={speaker.id}>
                                        {speaker.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {/* ---------------------------------------- */}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
                    {/* Update onClick to use the validation function */}
                    <Button variant="contained" onClick={handleCreateEvent}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ---------------------------------- */}


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
            <Typography variant='body2'>Location: <span style={{ fontWeight: 'bold' }}>{room.location}</span></Typography>
            <Typography variant='body2'>Room: <span style={{ fontWeight: 'bold' }}>{room.name}</span></Typography>
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

                const res = await client.get(`/tickets/event/${eventId}`);
                const ticket = res.data.ticket;

                if (ticket && ticket.rating) {
                    setRating(ticket.rating);
                    setFeedback(ticket.feedback || "");
                    setSubmitted(true);
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

function EventPrice({ eventID, basePrice = 100, teamId }: { basePrice?: number, eventID?: number, teamId?: number }) {
    const { user } = useAuth();
    const userId = user?.id;

    // 1. Capture the data from the query
    const { data: existingTicket } = useQuery({
        queryKey: ['my-ticket', eventID, userId], // Added userId to key for cache safety
        queryFn: async () => {
            // Ensure we handle the request correctly
            const res = await client.get(`/tickets/event/${eventID}`);
            // 2. IMPORTANT: You must return the data here
            return res.data.ticket;
        },
        // Optional: Only run query if we have an eventID and a user
        enabled: !!eventID && !!userId,
    });

    const currentPrice = useDiscountedPrice(basePrice, teamId);

    return (
        <div>
            {/* 3. Logic: If ticket exists, show that price. Else, show sales price. */}
            {existingTicket?.price != null ? (
                // --- CASE A: User already has a ticket ---
                <Typography variant="h6" >
                    {basePrice !=existingTicket.price && <span style={{ textDecoration: 'line-through', color: 'gray', marginRight: '4px' }}>
                        {basePrice}
                    </span>}
                    {existingTicket.price}
                    <span style={{ fontSize: 15 }}>EGP</span>
                </Typography>
            ) : (
                // --- CASE B: User does not have a ticket (Standard logic) ---
                basePrice !== currentPrice ? (
                    <Typography variant="h6">
                        {basePrice != currentPrice && <span style={{ textDecoration: 'line-through', color: 'gray', marginRight: '4px' }}>
                            {basePrice}
                        </span>}
                        {currentPrice}
                        <span style={{ fontSize: 15 }}>EGP</span>
                    </Typography>
                ) : (
                    <Typography variant="h6">
                        {basePrice}<span style={{ fontSize: 15 }}>EGP</span>
                    </Typography>
                )
            )}
        </div>
    );
}

// Custom hook to compute discounted price safely with React hooks
function useDiscountedPrice(basePrice: number = 100, teamId?: number) {
    const { user } = useAuth();
    const userId = user?.id;
    
    // Fetch only current user's badges (more secure and efficient)
    const { data: badgesData } = useQuery({
        queryKey: ['my-badges', userId],
        queryFn: async () => {
            const res = await client.get('/tickets/badges');
            return res.data.badges;
        },
        enabled: !!userId
    });
    
    const getPrice = () => {
        if (!badgesData || !userId) return basePrice;
        
        // Find badge for the specific team (team-specific discount)
        const userBadge = badgesData.find((badge: any) => 
            badge.userId === userId && badge.teamId === teamId
        );
        
        if (!userBadge) return basePrice;
        if (!userBadge.type) return basePrice;
        if (!userBadge.usageNum || userBadge.usageNum === 0) return basePrice;
        
        const badgeType = String(userBadge.type).toLowerCase();
        
        switch (badgeType) {
            case 'rising star':
                return basePrice * 0.9;
            case 'old star':
                return basePrice * 0.8;
            case 'top fan':
                return basePrice * 0.7;
            default:
                return basePrice;
        }
    };
    return getPrice();
}