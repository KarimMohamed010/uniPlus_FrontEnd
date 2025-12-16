import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import client from "../../api/client";
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Add  } from "@mui/icons-material";

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

// --- TeamDetails Component ---

interface Team {
  id: number;
  name: string;
  description: string;
  // ...
}

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = useState(0); // State to control which tab is open

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBackendAction = () => {
    console.log("Button clicked. Starting backend action...");
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
    <Box sx={{ width: "100%", p: 3 ,display:"flex",flexDirection:"column"}}>
      {/* 1. Header Banner (The Blue Div) */}
      <TeamBanner>
        <Typography variant="h3" sx={{ fontWeight: "bold" }}>
          {team.name}
        </Typography>
        <Typography variant="h6">{team.description}</Typography>
      </TeamBanner>

      <Button sx={{ mb: 3, ml: 'auto' }}
        variant="outlined"
        color="secondary"
        startIcon={<Add />}
        onClick={handleBackendAction}
      >
        Join Team
      </Button>

      {/* 2. Navigation Tabs (Stream / Classwork / People) */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="team navigation tabs"
        >
          <Tab label="Posts" />
          <Tab label="Events" />
          <Tab label="People" />
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
    </Box>
  );
}
