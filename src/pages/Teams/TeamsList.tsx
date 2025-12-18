import React, { useState, useMemo } from "react";
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
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import client from "../../api/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import { min } from "date-fns";

// --- Interfaces ---
interface Team {
  id: number;
  name: string;
  description: string;
  leaderId: number;
  userStatus?: {
    isLeader: boolean;
    isMember: boolean;
    isSubscribed: boolean;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// --- TabPanel Component ---
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

const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CreateTeamData = z.infer<typeof createTeamSchema>;

export default function TeamsList() {
  const [openCreate, setOpenCreate] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const userJsonString = localStorage.getItem("user");
  const userID = userJsonString ? parseInt(JSON.parse(userJsonString).id, 10) : 0;

  // --- 1. Data Fetching ---

  // Fetch All Teams
  const { data: allTeams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await client.get("/teams");
      return res.data;
    },
  });

  // Fetch Subscribed Teams
  const { data: subscribedTeams } = useQuery<Team[]>({
    queryKey: ["mySubscribedTeams"],
    queryFn: async () => (await client.get("/teams/my-subscribed")).data || [],
  });

  // Fetch Members for every team in parallel
  const memberQueries = useQueries({
    queries: (allTeams || []).map((team) => ({
      queryKey: ["teamMembers", team.id],
      queryFn: async () => {
        const res = await client.get(`/teams/${team.id}/members`);
        return {
          teamId: team.id,
          members: res.data.members || [],
        };
      },
      enabled: !!allTeams,
    })),
  });

  // --- 2. Filter & Search Logic ---

 const { filteredMyTeams, filteredDiscoverTeams } = useMemo(() => {
  if (!allTeams) return { filteredMyTeams: [], filteredDiscoverTeams: [] };

  const subscribedIds = new Set(subscribedTeams?.map((t) => t.id) || []);
  const myTeams: Team[] = [];
  const discoverTeams: Team[] = [];

  // 1. Process and Categorize
  allTeams.forEach((team, index) => {
    const isLeader = team.leaderId === userID;
    const teamMembersData = memberQueries[index]?.data?.members || [];
    const isMember = teamMembersData.some((m: any) => parseInt(m.studentId, 10) === userID);
    const isSubscribed = subscribedIds.has(team.id);

    const enrichedTeam = {
      ...team,
      userStatus: { isLeader, isMember, isSubscribed },
    };

    if (isLeader || isMember || isSubscribed) {
      myTeams.push(enrichedTeam);
    } else {
      discoverTeams.push(enrichedTeam);
    }
  });

  // 2. Search Filter Function
  const searchFilter = (t: Team) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().startsWith(lowerSearch) ||
      (t.description?.toLowerCase().startsWith(lowerSearch) ?? false)
    );
  };

  // 3. Priority Sorting Helper
  // We assign a numeric weight: Leader (3), Member (2), Subscriber (1)
  const getPriority = (t: Team) => {
    if (t.userStatus?.isLeader) return 3;
    if (t.userStatus?.isMember) return 2;
    if (t.userStatus?.isSubscribed) return 1;
    return 0;
  };

  return {
    // Sort by priority (highest weight first), then reverse the final filtered list
    filteredMyTeams: myTeams
      .filter(searchFilter)
      .sort((a, b) => getPriority(b) - getPriority(a)), // Sorting Lead > Member > Sub
    
    filteredDiscoverTeams: discoverTeams.filter(searchFilter).reverse(), // Reversed as requested
  };
}, [allTeams, subscribedTeams, memberQueries, userID, searchTerm]);

  // --- 3. Handlers ---

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTeamData>({
    resolver: zodResolver(createTeamSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTeamData) => client.post("/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setOpenCreate(false);
      reset();
    },
  });

  // --- 4. Render Helpers ---

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
              transition: "0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
              
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ mb: 1 }}>{team.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden"
              }}>
                {team.description}
              </Typography>
            </CardContent>
            <CardActions sx={{ display: "flex", gap:"min(1em,20%)", p: 2, alignItems: "flex-start" }}>
              <Typography variant="caption" color="secondary.dark" sx={{ fontWeight: 'bold', mb: 1 }}>
                {team.userStatus?.isLeader ? "LEADER" : 
                 team.userStatus?.isMember ? "MEMBER" : 
                 team.userStatus?.isSubscribed ? "SUBSCRIBER" : ""}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                fullWidth
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
          {searchTerm ? `No teams found matching "${searchTerm}"` : "No teams available."}
        </Typography>
      )}
    </Grid>
  );

  if (teamsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Teams</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}>
          Create Team
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`My Teams (${filteredMyTeams.length})`} />
          <Tab label={`Discover (${filteredDiscoverTeams.length})`} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by name or description..."
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

      <TabPanel value={tabValue} index={0}>
        {renderTeamCards(filteredMyTeams)}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {renderTeamCards(filteredDiscoverTeams)}
      </TabPanel>

      {/* Create Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Create New Team</DialogTitle>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
          <DialogContent>
            <TextField label="Team Name" fullWidth sx={{ mb: 2 }} {...register("name")} error={!!errors.name} helperText={errors.name?.message} />
            <TextField label="Description" fullWidth multiline rows={3} {...register("description")} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? <CircularProgress size={24} /> : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}