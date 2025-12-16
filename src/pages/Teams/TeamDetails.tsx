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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Add, Edit, ArrowBack } from "@mui/icons-material";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// --- Styled Components for the Layout ---

// 1. The Banner component (Blue Div)
const TeamBanner = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main, // Use the theme's blue
  color: "white",
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3),
  minHeight: 200, // Ensures it has height like the image
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  boxShadow: theme.shadows[3],
  // You can add the graduation cap image as a background if you have the asset
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

// --- TeamDetails Component ---

interface Team {
  id: number;
  name: string;
  description: string;
  leaderId: number;
  // ...
}

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [openEdit, setOpenEdit] = useState(false);
  const [tabValue, setTabValue] = useState(0); // State to control which tab is open

  const userJsonString = localStorage.getItem("user");
  const userID = userJsonString ? JSON.parse(userJsonString).id : 0;

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

  const isLeader = userID === team?.leaderId ;

  // --- Form Setup for Editing ---
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTeamData>({
    resolver: zodResolver(updateTeamSchema),
    // Setting default values based on fetched data
    defaultValues: {
      name: team?.name,
      description: team?.description,
    },
  });

  // Effect to reset form values when team data initially loads or changes
  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        description: team.description,
      });
    }
  }, [team, reset]);

  // 2. Define the Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateTeamData) => {
      // Calls router.patch("/:id", ...)
      return await client.patch(`/teams/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate the detail query to re-fetch and display the new data
      queryClient.invalidateQueries({ queryKey: ["teamDetail", id] });
      setOpenEdit(false); // Close the dialog
    },
    onError: (err: any) => {
      console.error("Team update failed:", err.message);
      // You might want a more user-friendly error display here
    },
  });

  // 3. Define the Submission Handler
  const handleUpdateSubmit = (data: UpdateTeamData) => {
    updateMutation.mutate(data); // Triggers the mutation
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleJoinAction = () => {
    prompt(String(userID) + "|" + team?.leaderId);
  };

  const handleEditAction = () => {
    if (team) {
      // Reset the form with the most current team data before opening the dialog
      reset({ name: team.name, description: team.description });
    }
    setOpenEdit(true);
  };

  // --- Loading and Error States (from previous answer) ---
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
  }

  // --- Render the new Tabbed Layout ---
  return (
    <Box sx={{ width: "100%", p: 3, display: "flex", flexDirection: "column" }}>
      {/* <Button sx={{alignSelf:"start"}}startIcon={<ArrowBack/>}>
        
      </Button> */}
      {/* 1. Header Banner (The Blue Div) */}

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
        <Button
          sx={{ ml: "auto" }}
          variant="outlined"
          color="secondary"
          startIcon={<Add />}
          onClick={handleJoinAction}
        >
          Apply to Join
        </Button>
      </Box>

      {/* 2. Navigation Tabs (Stream / Classwork / People) */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="team navigation tabs"
        >
          <Tab label="Posts" />
          <Tab label="Events" />
          <Tab label="Members" />
        </Tabs>
      </Paper>

      {/* 3. Tab Content */}

      {/* Tab 0: Posts (Feed) */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h5">Team Posts Feed</Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          {/* Placeholder for your actual Posts component */}
          <Typography>
            Here you will render the list of posts for Team: {team.name}
          </Typography>
        </Paper>
      </TabPanel>

      {/* Tab 1: Events */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h5">Team Events</Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          {/* Placeholder for your actual Events component */}
          <Typography>
            Here you will render the list of scheduled events for the team.
          </Typography>
        </Paper>
      </TabPanel>

      {/* Tab 2: People (Users) */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5">Team Members</Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          {/* Placeholder for your actual People component */}
          <Typography>
            Here you will render the list of users in the team.
          </Typography>
        </Paper>
      </TabPanel>

      {/* Create Team Dialog */}
      {isLeader && (
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <DialogTitle>Edit Team</DialogTitle>
        {/* 💡 FIX 1: Wrap dialog content in <form> and connect handleSubmit */}{" "}
        <form onSubmit={handleSubmit(handleUpdateSubmit)}>
          {" "}
          <DialogContent>
            {" "}
            <TextField
              margin="dense"
              label="Team Name"
              fullWidth
              {...register("name")}
              error={!!errors.name}
              helperText={errors.name?.message}
            />{" "}
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              {...register("description")}
            />{" "}
          </DialogContent>{" "}
          <DialogActions>
            {" "}
            <Button
              onClick={() => setOpenEdit(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            {/* 💡 FIX 2: Re-add the Submit button */}{" "}
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
            </Button>{" "}
          </DialogActions>
        </form>{" "}
      </Dialog>
      )}
    </Box>
  );
}
