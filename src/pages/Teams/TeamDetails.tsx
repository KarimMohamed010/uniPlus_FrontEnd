import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import { useForm } from "react-hook-form";
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  TextField,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  PersonAdd,
  Edit,
  Logout,
  Event as EventIcon,
  MailOutline,
  PhotoSizeSelectActualOutlined,
  Add
} from "@mui/icons-material";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EventsList from "../Events/EventsList";

// --- Styled Components for the Layout ---
const TeamBanner = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: "white",
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3),
  minHeight: 200,
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  boxShadow: theme.shadows[3],
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-tabpanel-${index}`}
      aria-labelledby={`team-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>} 
    </div>
  );
}

const updateTeamSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
});
type UpdateTeamData = z.infer<typeof updateTeamSchema>;

// --- TeamDetails Component Interfaces ---

interface Team {
  id: number;
  name: string;
  description: string;
  leaderId: number;
}

interface TeamMember {
  id: number;
  fname: string;
  lname: string;
  email: string;
  role: string;
}

interface LeaderProfile {
  id: number;
  fname: string;
  lname: string;
  email: string;
}

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [openEdit, setOpenEdit] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const userJsonString = localStorage.getItem("user");
  const userID = userJsonString
    ? parseInt(JSON.parse(userJsonString).id, 10)
    : 0; // 1. Fetch Team Details

  const {
    data: team,
    isLoading,
    error,
  } = useQuery<Team>({
    queryKey: ["teamDetail", id],
    queryFn: async () => {
      const res = await client.get(`/teams/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const isLeader = userID === team?.leaderId; // 2. Fetch Team Members

  const {
    data: teamMembers,
    isLoading: isMembersLoading,
    error: membersError,
  } = useQuery<TeamMember[]>({
    queryKey: ["teamMembers", id],
    queryFn: async () => {
      const res = await client.get(`/teams/${id}/members`);
      if (res.data && Array.isArray(res.data.members)) {
        return res.data.members.map((member: any) => ({
          id: parseInt(member.studentId, 10),
          fname: member.fname,
          lname: member.lname,
          email: member.email,
          role: member.role,
        })) as TeamMember[];
      }
      return [];
    },
    enabled: !!id,
  });

  const { data: teamLeaderProfile } = useQuery<LeaderProfile>({
    queryKey: ["teamLeaderProfile", team?.leaderId],
    queryFn: async () => {
      const res = await client.get(`/users/id/${team!.leaderId}`);
      return res.data.user;
    },
    enabled: !!team?.leaderId,
  }); // 4. Membership Checks

  const isMember = isLeader
    ? true
    : teamMembers && teamMembers.length > 0
    ? teamMembers.some((member) => member.id === userID)
    : false; // Filter members into categories

  const organizersArray: TeamMember[] =
    teamMembers?.filter((member) => member.role === "organizer") || [];
  const hrArray: TeamMember[] =
    teamMembers?.filter((member) => member.role === "hr") || [];
  const mediaTeamArray: TeamMember[] =
    teamMembers?.filter((member) => member.role === "mediaTeam") || []; // 5. Specific Role Checks

  const isOrganizer =
    !isLeader && organizersArray.some((member) => member.id === userID);
  const isHR = !isLeader && hrArray.some((member) => member.id === userID);
  const isMediaTeam =
    !isLeader && mediaTeamArray.some((member) => member.id === userID); // --- Handlers ---

  const handleCreateEvent = () => {
    prompt("Action: Open Create Event Form");
  };

  const handleJoinAction = () => {
    prompt("Action: Apply to Join Team");
  };

  const handleLeaveAction = () => {
    prompt("Action: Leave Team");
  };
  const handleSubscribeAction =()=>{
    prompt("Action: Subscribe to Team");
  }


  const handleEditAction = () => {
    if (team) {
      reset({ name: team.name, description: team.description });
    }
    setOpenEdit(true);
  }; // --- Tabs Logic ---

  const fixedTabs = [
    { label: "Posts", id: "posts" },
    { label: "Events", id: "events" },
    { label: "Members", id: "members" },
  ];

  const conditionalTabs = [];
  if (isMediaTeam || isLeader) {
    conditionalTabs.push({ label: "Pending Posts", id: "pendingPosts" });
  }
  if (isHR || isLeader) {
    conditionalTabs.push({ label: "Join Requests", id: "joinRequests" });
  }

  const allTabs = [...fixedTabs, ...conditionalTabs];
  const tabIndexMap = allTabs.reduce((map, tab, index) => {
    map[tab.id] = index;
    return map;
  }, {} as Record<string, number>); // --- Form Setup for Editing ---

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTeamData>({
    resolver: zodResolver(updateTeamSchema),
    defaultValues: {
      name: team?.name,
      description: team?.description,
    },
  });

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        description: team.description,
      });
    }
  }, [team, reset]); // Define the Update Mutation

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateTeamData) => {
      return await client.patch(`/teams/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamDetail", id] });
      setOpenEdit(false);
    },
    onError: (err: any) => {
      console.error("Team update failed:", err.message);
    },
  });

  const handleUpdateSubmit = (data: UpdateTeamData) => {
    updateMutation.mutate(data);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }; // --- Loading and Error States ---

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !team) {
    return (
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography color="error" variant="h6">
          Error loading team: {error?.message || "Team not found."} 
        </Typography>
        
      </Paper>
    );
  } // --- Reusable Member List Rendering Component ---

  const renderMemberList = (
    members: TeamMember[],
    title: string,
    isLeaderSection: boolean = false
  ) =>
    members.length > 0 && (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <List>
          {members.map((member) => (
            <ListItem
              key={member.id}
              divider
              secondaryAction={
                <Chip
                  label={
                    isLeaderSection && teamLeaderProfile
                      ? "Leader"
                      : member.role
                  }
                  size="small"
                  color={isLeaderSection ? "primary" : "default"}
                />
              }
            >
              <ListItemText
                primary={`${member.fname} ${member.lname} ${
                  isLeaderSection ? "(Team Leader)" : ""
                }`}
                secondary={member.email}
              />
            </ListItem>
          ))}

          {members.length === 0 && (
            <Typography color="text.secondary" sx={{ ml: 2 }}>
              None found.
            </Typography>
          )}
        </List>
        
      </Box>
    ); // --- Render the main Layout ---

  return (
    <Box sx={{ width: "100%", p: 3, display: "flex", flexDirection: "column" }}>
      {/* 1. Header Banner */} 
      <TeamBanner>
        <Typography variant="h3" sx={{ fontWeight: "bold" }}>
          {team.name}
        </Typography>
        <Typography variant="h6">{team.description}</Typography> 
      </TeamBanner>
      
      <Box sx={{ mb: 3, display: "flex" }}>
        {isLeader && (
          <Button
            sx={{ mr: "auto" }}
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            onClick={handleEditAction}
          >
            Edit Team
          </Button>
        )}
        {!isMember && (
          <Button
            sx={{ mr: "auto" }}
            variant="outlined"
            color="error"
            startIcon={<Add />}
            onClick={handleSubscribeAction}
          >
            Subscribe
          </Button>
        )}
        {/* Button: Apply to Join (If NOT a member) */}
        {!isMember && (
          <Button
            sx={{ ml: "auto" }}
            variant="outlined"
            color="secondary"
            startIcon={<PersonAdd />}
            onClick={handleJoinAction}
          >
            Apply to Join
          </Button>
        )}
        {/* Button: Leave Team (If IS a member AND NOT the leader) */}    
        {isMember && !isLeader && (
          <Button
            sx={{ ml: "auto" }}
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={handleLeaveAction}
          >
            Leave Team
          </Button>
        )}
        
      </Box>
      {/* 2. Navigation Tabs (Dynamic) */} 
      <Paper sx={{ mb: 3 }} square={true}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="team navigation tabs"
        >
          {allTabs.map((tab) => (
            <Tab key={tab.id} label={tab.label} />
          ))}
        </Tabs>
        
      </Paper>
      {/* 3. Tab Content */} {/* Tab: Posts */} 
      <TabPanel value={tabValue} index={tabIndexMap["posts"]}>
        <Typography variant="h5">Team Posts Feed</Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography>
            Here you will render the list of posts for Team:
            {team.name}
          </Typography>
        </Paper>
        
      </TabPanel>
      {/* Tab: Events */} 
      <TabPanel value={tabValue} index={tabIndexMap["events"]}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5">Team Events</Typography>
          {/* Create Event Button (Leader or Organizer Only) */}
          {(isLeader || isOrganizer) && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<EventIcon />}
              onClick={handleCreateEvent}
            >
              Create Event
            </Button>
          )}
        </Stack>
        
          <EventsList teamID={team.id} />
        
        
      </TabPanel>
      {/* Tab: Members */} 
      <TabPanel value={tabValue} index={tabIndexMap["members"]}>
        <Typography variant="h5">Team Members</Typography>
        {isMembersLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Team Leader */}
            {teamLeaderProfile && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Leader
                </Typography>

                <List>
                  <ListItem
                    divider
                    secondaryAction={<Chip label="Leader" size="small" />}
                  >
                    <ListItemText
                      primary={`${teamLeaderProfile.fname} ${teamLeaderProfile.lname}`}
                      secondary={teamLeaderProfile.email}
                    />
                  </ListItem>
                </List>
              </Box>
            )}
            {renderMemberList(organizersArray, "Organizers")}
            {renderMemberList(hrArray, "HR Team")}
            {renderMemberList(mediaTeamArray, "Media Team")}
            {membersError && (
              <Typography color="error">
                Error loading members. Check console for details.
              </Typography>
            )}
          </>
        )}
        
      </TabPanel>
      {/* Conditional Tab: Pending Posts (Media Team/Leader Only) */} 
      {(isMediaTeam || isLeader) && (
        <TabPanel value={tabValue} index={tabIndexMap["pendingPosts"]}>
          <Typography
            variant="h5"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <PhotoSizeSelectActualOutlined /> Pending Posts 
          </Typography>

          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography color="text.secondary">
              Only visible to the Media Team and Leader. Here you will list
              posts awaiting review/approval.
            </Typography>
          </Paper>
        </TabPanel>
      )}
      {/* Conditional Tab: Join Requests (HR Team/Leader Only) */} 
      {(isHR || isLeader) && (
        <TabPanel value={tabValue} index={tabIndexMap["joinRequests"]}>
          <Typography
            variant="h5"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <MailOutline /> Join Requests
          </Typography>

          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography color="text.secondary">
              Only visible to the HR Team and Leader. Here you will manage
              applications to join the team.
            </Typography>
          </Paper>
        </TabPanel>
      )}
      {/* Edit Team Dialog */} 
      {isLeader && (
        <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
          <DialogTitle>Edit Team: {team.name}</DialogTitle>
          <form onSubmit={handleSubmit(handleUpdateSubmit)}>
            <DialogContent>
              <TextField
                margin="dense"
                label="Team Name"
                fullWidth
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />

              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                {...register("description")}
              />
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => setOpenEdit(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
      
    </Box>
  );
}
