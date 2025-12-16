import React, { useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Tabs,
  Tab,
  InputAdornment,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../../api/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";


interface Team {
  id: number;
  name: string;
  description: string;
  acceptanceStatus: string; // Used to filter 'My Teams' vs 'All Teams'
}

// --- TabPanel Component Definition (Moved here for clean scope) ---
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
// -------------------------------------------------------------------

const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CreateTeamData = z.infer<typeof createTeamSchema>;

export default function TeamsList() {
  const [openCreate, setOpenCreate] = useState(false);
  const [tabValue, setTabValue] = useState(0); //  State for tab control
  const [searchTerm, setSearchTerm] = useState(""); //  State for search
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  //  Handler for updating the search term
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Fetch All Teams
  const { data: allTeams, isLoading } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await client.get("/teams"); // Fetches ALL teams, regardless of join status
      return res.data;
    },
  });

  // Function to filter by both acceptanceStatus AND team name
  const filterTeams = (
    teams: Team[] | undefined,
    status: string | "discover"
  ) => {
    if (!teams) return [];

    // 1. Filter by Status (My Teams vs Discover)
    const statusFiltered =
      status === "discover"
        ? teams.filter((team) => team.acceptanceStatus !== "accepted")
        : teams.filter((team) => team.acceptanceStatus === "accepted");

    // 2. Filter by Search Term
    if (!searchTerm) {
      return statusFiltered;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();

    return statusFiltered.filter((team) =>
      team.name.toLowerCase().startsWith(lowerCaseSearch)
    );
  };

  const myTeams = filterTeams(allTeams, "accepted");
  const discoverTeams = filterTeams(allTeams, "discover");
  // -------------------------------------------------------------------

  // ... (createTeamSchema, useForm, createMutation, handleCreate remains the same)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeamData>({
    resolver: zodResolver(createTeamSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTeamData) => {
      return await client.post("/teams", data);
    },
    onSuccess: () => {
      // Invalidate both lists if necessary, but "teams" should be enough
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setOpenCreate(false);
      reset();
    },
  });

  const handleCreate = (data: CreateTeamData) => {
    createMutation.mutate(data);
  };

  // --- Reusable Team Card Renderer ---
  const renderTeamCards = (teamsToDisplay: Team[]) => (
    <Grid container spacing={3}>
      {teamsToDisplay.map((team) => (
        <Grid item xs={12} sm={6} md={4} key={team.id}>
          <Card
            sx={{
              minWidth: { xs: 200, sm: 250 },
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography
                variant="h5"
                component="div"
                sx={{ mb: 1, color: "text.primary" }}
              >
                {team.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {team.description}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", pr: 2, pb: 2 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                View Details
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
      {teamsToDisplay.length === 0 && (
        <Typography sx={{ mt: 2, ml: 2 }} color="text.secondary">
          {tabValue === 0
            ? "You have not joined any teams yet."
            : "No other teams found for discovery."}
        </Typography>
      )}
    </Grid>
  );
  // ------------------------------------

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Teams</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreate(true)}
        >
          Create Team
        </Button>
      </Box>

      {/*  NEW TAB STRUCTURE  */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="team listing tabs"
        >
          <Tab label={`My Teams (${myTeams.length})`} />
          <Tab label={`Discover Teams (${discoverTeams.length})`} />
        </Tabs>

        {/* Search Bar Component */}
        <Box sx={{ p: 2, pt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search teams by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* Tab 0: My Teams */}
      <TabPanel value={tabValue} index={0}>
        {renderTeamCards(myTeams)}
      </TabPanel>

      {/* Tab 1: Discover Teams (Teams I am not in) */}
      <TabPanel value={tabValue} index={1}>
        {renderTeamCards(discoverTeams)}
      </TabPanel>

      {/* Create Team Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Create New Team</DialogTitle>
        {/* 💡 FIX 1: Wrap dialog content in <form> and connect handleSubmit */}
        <form onSubmit={handleSubmit(handleCreate)}>
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
              onClick={() => setOpenCreate(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            {/* 💡 FIX 2: Re-add the Submit button */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                "Create"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
