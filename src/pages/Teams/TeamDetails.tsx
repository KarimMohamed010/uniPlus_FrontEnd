import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import { useForm } from "react-hook-form";
import {
  Typography,
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ImageList,
  ImageListItem,
  Snackbar,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  PersonAdd,
  Edit,
  Logout,
  Event as EventIcon,
  MailOutline,
  PhotoSizeSelectActualOutlined,
  Add,
} from "@mui/icons-material";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EventsList from "../Events/EventsList";
import { useNavigate } from "react-router-dom";
import { FileUploaderRegular } from "@uploadcare/react-uploader";
import "@uploadcare/react-uploader/core.css";
import FeedPostCard, { type FeedPost } from '../../components/FeedPostCard'

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


type NewPostMediaItem = {
  url: string;
  type: string;
  description?: string;
};


export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [openEdit, setOpenEdit] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportType, setReportType] = useState<"participation" | "engagement">(
    "participation"
  );
  const [reportScope, setReportScope] = useState<"event" | "team">("event");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year" | "all">(
    "month"
  );
  const [reportData, setReportData] = useState<
    Array<{
      id: string | number;
      name: string;
      participants: number;
      attendanceRate?: number;
      engagementScore?: number;
      totalInteractions?: number;
      date: string;
    }>
  >([]);

  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [createPostError, setCreatePostError] = useState("");
  const [newPostMedia, setNewPostMedia] = useState<NewPostMediaItem[]>([]);

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinRole, setJoinRole] = useState("organizer");
  const [cvUrl, setCvUrl] = useState("");
  const [joinError, setJoinError] = useState("");

  // Create Event Dialog State
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState("offline");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventBasePrice, setEventBasePrice] = useState<number>(0);
  const [createEventError, setCreateEventError] = useState("");

  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>(
    {}
  );
  const [commentErrors, setCommentErrors] = useState<Record<number, string>>(
    {}
  );
  
  const userJsonString = localStorage.getItem("user");
  const userID = userJsonString
    ? parseInt(JSON.parse(userJsonString).id, 10)
    : 0;

  // 1. Fetch Team Details
  const userGlobalRole = userJsonString
    ? JSON.parse(userJsonString).roles?.global
    : undefined;
  const isAdmin = userGlobalRole === "admin";

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });


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

  const { data: mySubscribedTeams } = useQuery<any[]>({
    queryKey: ["mySubscribedTeams"],
    queryFn: async () => {
      const res = await client.get("/teams/my-subscribed");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

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


  const isSubscribed = !!mySubscribedTeams?.some(
    (t: any) => t?.id === team?.id
  );

  const organizersArray: TeamMember[] =
    teamMembers?.filter((member) => member.role?.toLowerCase() === "organizer") || [];
  const hrArray: TeamMember[] =
    teamMembers?.filter((member) => member.role?.toLowerCase() === "hr") || [];
  const mediaTeamArray: TeamMember[] =
    teamMembers?.filter((member) => member.role?.toLowerCase() === "mediateam") || []; // 5. Specific Role Checks

  const isOrganizer =
    !isLeader && organizersArray.some((member) => member.id === userID);
  const isHR = !isLeader && hrArray.some((member) => member.id === userID);
  const isMediaTeam =
    !isLeader && mediaTeamArray.some((member) => member.id === userID); // --- Handlers ---

  const {
    data: reportedPosts,
    isLoading: isReportedLoading,
  } = useQuery<any[]>({
    queryKey: ["reportedPosts", id],
    queryFn: async () => {
      const res = await client.get(`/posts/team/${id}/reported`);
      return Array.isArray(res.data?.posts) ? res.data.posts : [];
    },
    enabled: !!id && (isMediaTeam || isLeader),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      return await client.delete(`/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reportedPosts", id] });
      queryClient.invalidateQueries({ queryKey: ["teamPosts", id] });
      setSnackbar({
        open: true,
        message: "Post removed successfully",
        severity: "success",
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to remove post",
        severity: "error",
      });
    },
  });

  const {
    data: teamPosts,
    isLoading: isPostsLoading,
    error: postsError,
  } = useQuery<FeedPost[]>({
    queryKey: ["teamPosts", id],
    queryFn: async () => {
      const res = await client.get(`/posts/team/${id}`);
      return Array.isArray(res.data?.posts)
        ? (res.data.posts as FeedPost[])
        : [];
    },
    enabled: !!id,
  });

  const canCreatePost =
    isAdmin || isLeader || isOrganizer || isMediaTeam || isHR || isSubscribed;

  const createPostMutation = useMutation({
    mutationFn: async () => {
      setCreatePostError("");
      if (!id) throw new Error("Missing team id");
      const text = newPostText.trim();
      if (!text) throw new Error("Post content is required");
      await client.post("/posts", {
        description: text,
        teamId: Number(id),
        media: newPostMedia,
      });
    },
    onSuccess: () => {
      setCreatePostOpen(false);
      setNewPostText("");
      setNewPostMedia([]);
      queryClient.invalidateQueries({ queryKey: ["teamPosts", id] });
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
    },
    onError: (e: any) => {
      setCreatePostError(
        e?.response?.data?.error || e?.message || "Failed to create post"
      );
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!cvUrl) throw new Error("Please upload your CV first");

      // The keys must match the applyToTeamSchema in your router
      return await client.post(`/students/teams/apply`, {
        teamId: Number(id),
        desiredRole: joinRole, // Must match Zod 'desiredRole'
        cv: cvUrl, // Must match Zod 'cv'
      });
    },
    onSuccess: () => {
      setJoinDialogOpen(false);
      setCvUrl("");
      setJoinError("");
      setSnackbar({
        open: true,
        message: "Application submitted successfully!",
        severity: "success",
      });
    },
    onError: (err: any) => {
      // This will now catch the specific validation error if it fails again
      setJoinError(err.response?.data?.error || "Failed to submit application");
    },
  });

  const { data: applications, isLoading: isAppsLoading } = useQuery<any[]>({
    queryKey: ["teamApps", id],
    queryFn: async () => {
      const res = await client.get(`/teams/${id}/applications`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!id && (isLeader || isHR),
  });

  const hasApplied = applications && applications.length > 0
    ? applications.some((app: any) => app.studentId === userID)
    : false;

  const acceptAppMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return await client.post(`/teams/${id}/applications/${studentId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamApps", id] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers", id] });
      setSnackbar({ open: true, message: "Application accepted", severity: "success" });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to accept application",
        severity: "error",
      });
    },
  });

  const rejectAppMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return await client.post(`/teams/${id}/applications/${studentId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamApps", id] });
      setSnackbar({ open: true, message: "Application rejected", severity: "success" });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to reject application",
        severity: "error",
      });
    },
  });
  const addCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: number;
      content: string;
    }) => {
      await client.post("/comments", { postId, content });
    },
    onSuccess: (_data, variables) => {
      setCommentDrafts((prev) => ({ ...prev, [variables.postId]: "" }));
      queryClient.invalidateQueries({
        queryKey: ["postComments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
    },
    onError: (e: any, variables) => {
      setCommentErrors((prev) => ({
        ...prev,
        [variables.postId]: e?.response?.data?.error || "Failed to add comment",
      }));
    },
  });

  const canComment = canCreatePost;
  //
  //
  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  const handleCreateEvent = () => {
    setCreateEventOpen(true);
  };

  const createEventMutation = useMutation({
    mutationFn: async () => {
      setCreateEventError("");
      if (!eventTitle.trim()) throw new Error("Title is required");
      if (!eventStartTime) throw new Error("Start time is required");
      if (!eventEndTime) throw new Error("End time is required");

      return await client.post("/events", {
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        type: eventType,
        startTime: new Date(eventStartTime).toISOString(),
        endTime: new Date(eventEndTime).toISOString(),
        teamId: Number(id),
        basePrice: eventBasePrice > 0 ? eventBasePrice : undefined,
      });
    },
    onSuccess: () => {
      setCreateEventOpen(false);
      // Reset form
      setEventTitle("");
      setEventDescription("");
      setEventType("offline");
      setEventStartTime("");
      setEventEndTime("");
      setEventBasePrice(0);
      // Invalidate team events to refresh
      queryClient.invalidateQueries({ queryKey: ["teamEvents", id] });
    },
    onError: (e: any) => {
      setCreateEventError(
        e?.response?.data?.error || e?.message || "Failed to create event"
      );
    },
  });

  const handleJoinAction = () => {
    setJoinDialogOpen(true);
  };

  const leaveTeamMutation = useMutation({
    mutationFn: async () => {
      return await client.delete(`/teams/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers", id] });
      setSnackbar({ open: true, message: "Left team successfully", severity: "success" });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to leave team",
        severity: "error",
      });
    },
  });

  const handleLeaveAction = () => {
    leaveTeamMutation.mutate();
  };
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      return await client.post(`/teams/${id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySubscribedTeams"] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      return await client.delete(`/teams/${id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySubscribedTeams"] });
    },
  });

  const handleSubscribeAction = () => {
    if (!id) return;
    if (isSubscribed) {
      unsubscribeMutation.mutate();
    } else {
      subscribeMutation.mutate();
    }
  };

  const handleEditAction = () => {
    if (team) {
      reset({ name: team.name, description: team.description });
    }
    setOpenEdit(true);
  }; // --- Tabs Logic ---

  const canViewReports = isAdmin || isLeader || isOrganizer;

  const fetchTeamReport = async () => {
    if (!id) return;
    try {
      setReportsLoading(true);
      setReportsError("");

      const reportPath =
        reportType === "participation"
          ? `/reports/teams/${id}/participation`
          : `/reports/teams/${id}/engagement`;

      const response = await client.get(reportPath, {
        params: {
          scope: reportScope,
          timeRange,
        },
      });

      const apiData = response.data.data || [];
      const formattedData = apiData.map((item: any) => ({
        id: item.id,
        name: item.name,
        participants: item.participants || 0,
        attendanceRate: item.attendanceRate,
        engagementScore: item.engagementScore,
        totalInteractions: item.totalInteractions,
        date: item.date || new Date().toISOString().split("T")[0],
      }));

      setReportData(formattedData);
    } catch (error: any) {
      console.error("Failed to load team report:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to load report.";
      setReportsError(errorMessage);
    } finally {
      setReportsLoading(false);
    }
  };

  const fixedTabs = [
    { label: "Posts", id: "posts" },
    { label: "Events", id: "events" },
    { label: "Members", id: "members" },
  ];

  const conditionalTabs = [];
  // if (isMediaTeam || isLeader) {
  //   conditionalTabs.push({ label: "Pending Posts", id: "pendingPosts" });
  // }
  if (isHR || isLeader) {
    conditionalTabs.push({ label: "Pending Applications", id: "joinRequests" });
  }
  if (isMediaTeam || isLeader) {
    conditionalTabs.push({ label: "Reported Posts", id: "reportedPosts" });
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
                primary={`${member.fname} ${member.lname} ${isLeaderSection ? "(Team Leader)" : ""
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
            {isSubscribed ? "Unsubscribe" : "Subscribe"}
          </Button>
        )}
        {/* Button: Apply to Join (If NOT a member) */}
        {!isMember && !hasApplied && (
          <Button
            sx={{ ml: "auto" }}
            variant="outlined"
            color="secondary"
            startIcon={<PersonAdd />}
            onClick={handleJoinAction}
          >
            Apply For a Role
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
        {canViewReports && (
          <Button
            sx={{ ml: 2 }}
            variant="contained"
            color="primary"
            onClick={() => {
              setReportsOpen(true);
              setReportData([]);
              setReportsError("");
              fetchTeamReport();
            }}
          >
            Reports
          </Button>
        )}
      </Box>
      <Dialog
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Team Reports</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {reportsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reportsError}
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <FormControl fullWidth>
              <InputLabel id="team-report-type">Report</InputLabel>
              <Select
                labelId="team-report-type"
                label="Report"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
              >
                <MenuItem value="participation">Participation</MenuItem>
                <MenuItem value="engagement">Engagement</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="team-report-scope">Scope</InputLabel>
              <Select
                labelId="team-report-scope"
                label="Scope"
                value={reportScope}
                onChange={(e) => setReportScope(e.target.value as any)}
              >
                <MenuItem value="event">Per Event</MenuItem>
                <MenuItem value="team">Team Overall</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="team-report-range">Time Range</InputLabel>
              <Select
                labelId="team-report-range"
                label="Time Range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>Name</TableCell>
                  {reportType === "participation" ? (
                    <>
                      <TableCell align="right">Participants</TableCell>
                      <TableCell align="right">Attendance Rate</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell align="right">Participants</TableCell>
                      <TableCell align="right">Engagement</TableCell>
                      <TableCell align="right">Feedback Count</TableCell>
                    </>
                  )}
                  <TableCell align="right">Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={reportType === "participation" ? 4 : 5}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : reportData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={reportType === "participation" ? 4 : 5}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <Typography color="textSecondary">No data</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      {reportType === "participation" ? (
                        <>
                          <TableCell align="right">
                            {item.participants}
                          </TableCell>
                          <TableCell align="right">
                            {item.attendanceRate ?? 0}%
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align="right">
                            {item.participants}
                          </TableCell>
                          <TableCell align="right">
                            {item.engagementScore ?? 0}
                          </TableCell>
                          <TableCell align="right">
                            {item.totalInteractions ?? 0}
                          </TableCell>
                        </>
                      )}
                      <TableCell align="right">
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportsOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={fetchTeamReport}
            disabled={reportsLoading}
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>
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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5">Team Posts</Typography>
          {canCreatePost && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreatePostOpen(true)}
            >
              Create Post
            </Button>
          )}
        </Stack>

        <Box sx={{ mt: 2 }}>
          {isPostsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : postsError ? (
            <Alert severity="error">Failed to load team posts.</Alert>
          ) : (teamPosts || []).length === 0 ? (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">No posts yet.</Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {(teamPosts || []).map((post) => {
                const isOpen = !!expandedComments[post.id];
                return (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    isOpen={isOpen}
                    onToggle={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    commentDraft={commentDrafts[post.id] || ""}
                    setCommentDraft={(value) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post.id]: value,
                      }))
                    }
                    commentError={commentErrors[post.id]}
                    clearCommentError={() =>
                      setCommentErrors((prev) => ({ ...prev, [post.id]: "" }))
                    }
                    canComment={canComment && !addCommentMutation.isPending}
                    onSubmitComment={(content) => {
                      if (!content) {
                        setCommentErrors((prev) => ({
                          ...prev,
                          [post.id]: "Comment can't be empty",
                        }));
                        return;
                      }
                      addCommentMutation.mutate({ postId: post.id, content });
                    }}
                  />
                );
              })}
            </Stack>
          )}
        </Box>
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
      {/* Conditional Tab: Join Requests (HR Team/Leader Only) */}
      {(isHR || isLeader) && (
        <TabPanel value={tabValue} index={tabIndexMap["joinRequests"]}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Pending Applications
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>Applicant Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Required Role</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>CV</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isAppsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : (applications || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No pending applications.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (applications || []).map((app: any) => (
                    <TableRow key={app.studentId}>
                      <TableCell>{`${app.fname} ${app.lname}`}</TableCell>
                      <TableCell>
                        <Chip
                          label={app.role}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          href={app.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View CV
                        </Button>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => acceptAppMutation.mutate(app.studentId)}
                            disabled={acceptAppMutation.isPending || rejectAppMutation.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => rejectAppMutation.mutate(app.studentId)}
                            disabled={acceptAppMutation.isPending || rejectAppMutation.isPending}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      )}

      {/* Conditional Tab: Reported Posts (Media Team/Leader Only) */}
      {(isMediaTeam || isLeader) && (
        <TabPanel value={tabValue} index={tabIndexMap["reportedPosts"]}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Reported Posts
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>Creator Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Time Published</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isReportedLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : (reportedPosts || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        No reported posts.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (reportedPosts || []).map((report: any) => (
                    <TableRow key={report.post_id}>
                      <TableCell>{report.creator_name}</TableCell>
                      <TableCell>{report.creator_email}</TableCell>
                      <TableCell>
                        {new Date(report.published_at).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          disabled={deletePostMutation.isPending}
                          onClick={() => {
                            deletePostMutation.mutate(report.post_id);
                          }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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
      <Dialog
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Post</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {createPostError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createPostError}
            </Alert>
          )}

          <TextField
            label="What's new?"
            fullWidth
            multiline
            minRows={4}
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Media
            </Typography>
            <FileUploaderRegular
              sourceList="local,camera,gdrive"
              classNameUploader="uc-light"
              pubkey="1ed9d5259738cb825f1c"
              multiple={true}
              onChange={(items: any) => {
                const entries = (items?.allEntries || []) as any[];
                const uploaded = entries
                  .filter((f) => f?.status === "success" && f?.cdnUrl)
                  .map((f) => {
                    const url = String(f.cdnUrl);
                    const type =
                      (f?.mimeType as string | undefined) ||
                      (f?.fileInfo?.mimeType as string | undefined) ||
                      "image";
                    return { url, type } as NewPostMediaItem;
                  });
                // Deduplicate by URL to prevent duplicates
                const uniqueMedia = uploaded.filter(
                  (item, index, self) =>
                    index === self.findIndex((t) => t.url === item.url)
                );
                setNewPostMedia(uniqueMedia);
              }}
            />

            {newPostMedia.length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {newPostMedia.map((m) => (
                  <Paper key={m.url} variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {m.type}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", wordBreak: "break-all" }}
                    >
                      {m.url}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          {/* <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Posting is allowed for the team leader, organizers/media team, or
            admins.
          </Typography> */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePostOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createPostMutation.mutate()}
            disabled={createPostMutation.isPending}
          >
            Publish
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Apply to Join {team?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {joinError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {joinError}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 2 }}>
            Please select the Role you are interested in and upload your
            CV/Portfolio.
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="join-role-label">Target Role</InputLabel>
            <Select
              labelId="join-role-label"
              value={joinRole}
              label="Target Role"
              onChange={(e) => setJoinRole(e.target.value)}
            >
              <MenuItem value="organizer">Organizers Team</MenuItem>
              <MenuItem value="hr">HR Team</MenuItem>
              <MenuItem value="mediaTeam">Media Team</MenuItem>
            </Select>
          </FormControl>

          <Box
            sx={{
              p: 2,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              textAlign: "center",
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Upload CV (PDF or Image)
            </Typography>
            <FileUploaderRegular
              sourceList="local,camera,gdrive"
              classNameUploader="uc-light"
              pubkey="1ed9d5259738cb825f1c"
              multiple={false} // Applications usually only need one CV
              onChange={(items) => {
                // Extract the successful upload URL from Uploadcare
                const successFile = items.allEntries.find(
                  (file: any) => file.status === "success"
                );
                if (successFile) {
                  setCvUrl(String(successFile.cdnUrl)); // This populates the cvUrl state
                  setJoinError(""); // Clear previous errors
                }
              }}
            />
            {cvUrl && (
              <Typography
                color="success.main"
                variant="caption"
                sx={{ mt: 1, display: "block" }}
              >
                File uploaded successfully!
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || !cvUrl}
          >
            {applyMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              "Submit Application"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {createEventError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createEventError}
            </Alert>
          )}

          <TextField
            label="Event Title"
            fullWidth
            required
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="event-type-label">Event Type</InputLabel>
            <Select
              labelId="event-type-label"
              value={eventType}
              label="Event Type"
              onChange={(e) => setEventType(e.target.value)}
            >
              <MenuItem value="offline">Offline</MenuItem>
              <MenuItem value="online">Online</MenuItem>
              <MenuItem value="hybrid">Hybrid</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Start Date & Time"
            type="datetime-local"
            fullWidth
            required
            value={eventStartTime}
            onChange={(e) => setEventStartTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }}
          />

          <TextField
            label="End Date & Time"
            type="datetime-local"
            fullWidth
            required
            value={eventEndTime}
            onChange={(e) => setEventEndTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Base Price (optional)"
            type="number"
            fullWidth
            value={eventBasePrice}
            onChange={(e) => setEventBasePrice(Number(e.target.value))}
            slotProps={{ input: { inputProps: { min: 0 } } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEventOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createEventMutation.mutate()}
            disabled={createEventMutation.isPending}
          >
            {createEventMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              "Create Event"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
