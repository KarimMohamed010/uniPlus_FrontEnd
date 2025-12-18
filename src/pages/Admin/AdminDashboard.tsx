import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Container,
} from "@mui/material";
import { Download, Add } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
const schema = z.object({
  fname: z.string().min(1, "First name is required"),
  lname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  userPassword: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  role: z.enum(["student", "admin"]),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "student",
    },
  });

  const [error, setError] = useState("");
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError("");
    try {
      await client.post("/admin", data);
      setSuccessMessage("Admin created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      if (err instanceof AxiosError && err.response) {
        setError(err.response.data.error);
      } else {
        setError("Failed to register");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateManagerialReport = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await client.get("/reports/managerial");
      setManagerialReport(response.data.data);
      setSuccessMessage("Managerial report generated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Failed to generate managerial report:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Failed to generate managerial report. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Event/Organization Approval States
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<
    Array<{
      id: string;
      name: string;
      type: "event" | "team";
      submittedBy: string;
      date: string | null;
    }>
  >([]);
  const [selectedApprovalItem, setSelectedApprovalItem] = useState<null | {
    id: string;
    name: string;
    type: "event" | "team";
    submittedBy: string;
    date: string | null;
  }>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [approvalItemDetails, setApprovalItemDetails] = useState<any>(null);

  // Reports States
  const [reportType, setReportType] = useState<"participation" | "engagement">("participation");
  const [reportScope, setReportScope] = useState<"event" | "team">("event");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year" | "all">("month");
  const [reportData, setReportData] = useState<Array<{
    id: string | number;
    name: string;
    participants: number;
    attendanceRate?: number;
    engagementScore?: number;
    totalInteractions?: number;
    date: string;
  }>>([]);
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  const [managerialReport, setManagerialReport] = useState<null | {
    totalUsers: number;
    totalStudents: number;
    totalAdmins: number;
    totalTeams: number;
    totalEvents: number;
    approvedEvents: number;
    pendingEvents: number;
    rejectedEvents: number;
    totalRegistrations: number;
    uniqueRegistrants: number;
    totalCheckins: number;
    checkinRate: number;
    avgTicketPrice: number;
    minTicketPrice: number;
    maxTicketPrice: number;
    avgRating: number;
    feedbackCount: number;
    totalPosts: number;
    totalComments: number;
    totalMessages: number;
    totalRides: number;
    totalApplications: number;
  }>(null);

  // Admin List State
  const [adminsList, setAdminsList] = useState<
    Array<{
      id: number;
      fname: string;
      lname: string;
      username: string;
      email: string;
    }>
  >([]);

  // Rooms State
  const [roomsList, setRoomsList] = useState<
    Array<{
      id: number;
      name: string;
      capacity: number;
      location: string | null;
    }>
  >([]);
  //Speakers state
  const [speakerssList, setSpeakersList] = useState<
    Array<{
      id: number;
      name: string;
      fname: string;
      lname: string;
      bio: string | null;
      email: string;
      contact: number;
    }>
  >([]);
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState<number>(0);
  const [roomLocation, setRoomLocation] = useState("");
    // add speaker state
    // Add Speaker Dialog State
const [addSpeakerDialogOpen, setAddSpeakerDialogOpen] = useState(false);
const [speakerName, setSpeakerName] = useState("");
const [speakerEmail, setSpeakerEmail] = useState("");
const [speakerBio, setSpeakerBio] = useState("");
const [speakerFname, setSpeakerFname] = useState("");
const [speakerLname, setSpeakerLname] = useState("");
const [speakerContact, setSpeakerContact] = useState<number | "">("");
// handle add
// Add Speaker Handler
const handleAddSpeaker = async () => {
  try {
    if (!speakerName || !speakerEmail) {
      setError("Speaker name and email are required");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    await client.post("/admin/speakers", {
      name: speakerName,
      email: speakerEmail,
      bio: speakerBio || undefined,
      fname: speakerFname || undefined,
      lname: speakerLname || undefined,
      contact: speakerContact || undefined,
    });
    
    setSuccessMessage("Speaker added successfully!");
    setAddSpeakerDialogOpen(false);
    
    // Clear form fields
    setSpeakerName("");
    setSpeakerEmail("");
    setSpeakerBio("");
    setSpeakerFname("");
    setSpeakerLname("");
    setSpeakerContact("");
    
    fetchSpeakers();
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error("Failed to add speaker:", err);
    if (err instanceof AxiosError && err.response) {
      setError(err.response.data.error || "Failed to add speaker");
    } else {
      setError("Failed to add speaker");
    }
  } finally {
    setIsLoading(false);
  }
};
  // Fetch Admins
  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await client.get("/admin");
      setAdminsList(response.data.admins || []);
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Rooms
  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await client.get("/events/rooms");
      setRoomsList(response.data.rooms || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setError("Failed to fetch rooms");
    } finally {
      setIsLoading(false);
    }
  };
  // fetch speakers
  const fetchSpeakers = async () => {
    try {
      setIsLoading(true);
      const response = await client.get("/events/speakers");
      setSpeakersList(response.data.speakers || response.data || []);
    } catch (error) {
      console.error("Failed to fetch speakers:", error);
      setError("Failed to fetch speakers");
    } finally {
      setIsLoading(false);
    }
  };

  // Add Room Handler
  const handleAddRoom = async () => {
    try {
      if (!roomName || roomCapacity < 1) {
        setError("Room name and capacity are required");
        return;
      }
      setIsLoading(true);
      setError("");
      await client.post("/events/rooms", {
        name: roomName,
        capacity: roomCapacity,
        location: roomLocation || undefined,
      });
      setSuccessMessage("Room added successfully!");
      setAddRoomDialogOpen(false);
      setRoomName("");
      setRoomCapacity(0);
      setRoomLocation("");
      fetchRooms();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to add room:", err);
      if (err instanceof AxiosError && err.response) {
        setError(err.response.data.error);
      } else {
        setError("Failed to add room");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Remove Admin Handler
  const handleRemove = async (id : number) => {
    try {
      setIsLoading(true);
      const response = await client.delete(`/admin/${id}`);
      setSuccessMessage("Admin removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchAdmins();
      return response.data;
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Handle Speaker deletion
  const handleSpeakerRemove = async (id : number) => {
    try {
      setIsLoading(true);
      const response = await client.delete(`admin/speakers/${id}`);
      setSuccessMessage("speaker removed successfully!");
      fetchSpeakers();
      return response.data;
    } catch (error) {
      console.error("Failed to fetch speaker:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Handle room deletion
  const handleRoomRemove = async (id : number) => {
    try {
      setIsLoading(true);
      const response = await client.delete(`admin/rooms/${id}`);
      setSuccessMessage("Room removed successfully!");
      fetchRooms();
      return response.data;
    } catch (error) {
      console.error("Failed to fetch Room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Event/Organization Approval
  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await client.get("/admin/approvals/pending");
      setPendingApprovals(response.data.items || []);
    } catch (error: any) {
      console.error("Failed to fetch pending approvals:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to fetch pending approvals.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchPendingApprovals();
    } else if (tabValue === 4) {
      fetchRooms();
      fetchSpeakers();
    }
  }, [tabValue]);

  const handleApproveItem = async (approved: boolean) => {
    try {
      if (!selectedApprovalItem) return;
      setIsLoading(true);
      await client.patch(
        `/admin/approvals/${selectedApprovalItem.type}/${selectedApprovalItem.id}`,
        {
          approved,
        }
      );
      setSuccessMessage(
        `Item ${approved ? "approved" : "rejected"} successfully!`
      );
      setApprovalDialogOpen(false);
      setSelectedApprovalItem(null);
      await fetchPendingApprovals();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to process approval:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApprovalItem = async (item: {
    id: string;
    type: "event" | "team";
  }) => {
    try {
      setIsLoading(true);
      setError("");
      await client.delete(`/admin/approvals/${item.type}/${item.id}`);
      setSuccessMessage("Item removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      await fetchPendingApprovals();
    } catch (error: any) {
      console.error("Failed to remove item:", error);
      const errorMessage = error.response?.data?.error || "Failed to remove item.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetails = async (item: {
    id: string;
    type: "event" | "team";
  }) => {
    try {
      setIsLoading(true);
      setError("");
      const response = await client.get(`/admin/approvals/${item.type}/${item.id}`);
      setApprovalItemDetails(response.data);
      setDetailsDialogOpen(true);
    } catch (error: any) {
      console.error("Failed to fetch item details:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to fetch item details.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Reports
  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      const response = await client.get(`/reports/${reportType}`, {
        params: {
          scope: reportScope,
          timeRange: timeRange
        }
      });
      
      const apiData = response.data.data || [];
      
      const formattedData = apiData.map((item: any) => ({
        id: item.id,
        name: item.name,
        participants: item.participants || 0,
        attendanceRate: item.attendanceRate,
        engagementScore: item.engagementScore,
        totalInteractions: item.totalInteractions,
        date: item.date || new Date().toISOString().split('T')[0]
      }));
      
      setReportData(formattedData);
      setIsReportGenerated(true);
      setSuccessMessage("Report generated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      const errorMessage = error.response?.data?.error || "Failed to generate report. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    try {
      const headers = [];
      const dataRows: string[] = [];
      
      if (reportType === 'participation') {
        headers.push('Name', 'Participants', 'Attendance Rate (%)', 'Date');
        reportData.forEach(item => {
          dataRows.push([
            `"${item.name}"`,
            item.participants,
            item.attendanceRate,
            new Date(item.date).toLocaleDateString()
          ].join(','));
        });
      } else {
        headers.push('Name', 'Engagement Score', 'Feedback Count', 'Participants', 'Date');
        reportData.forEach(item => {
          dataRows.push([
            `"${item.name}"`,
            item.engagementScore,
            item.totalInteractions,
            item.participants,
            new Date(item.date).toLocaleDateString()
          ].join(','));
        });
      }
      
      const csvContent = [
        headers.join(','),
        ...dataRows
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage("Report downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error downloading report:", error);
      setError("Failed to download report. Please try again.");
    }
  };

  if (user?.roles.global !== "admin") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied. Only administrators can access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Card>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Admin Dashboard
          </Typography>

          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            aria-label="admin tabs"
          >
            <Tab label="Event/Team Approvals" id="admin-tab-0" />
            <Tab label="Add Admin" id="admin-tab-1" />
            <Tab label="Reports" id="admin-tab-2" />
            <Tab label="Managerial Reports" id="admin-tab-3" />
            <Tab label="Rooms/Speakers" id="admin-tab-4" />
          </Tabs>

          {/* TAB 0: Event/Organization Approvals */}
          <TabPanel value={tabValue} index={0}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Pending Approvals
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {successMessage}
                </Alert>
              )}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Submitted By</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingApprovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            No pending approvals
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingApprovals.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.submittedBy}</TableCell>
                          <TableCell>
                            {item.date ? new Date(item.date).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => handleOpenDetails(item)}
                            >
                              Details
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setSelectedApprovalItem(item);
                                setApprovalDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleRemoveApprovalItem(item)}
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

              {/* Approval Dialog */}
              <Dialog
                open={approvalDialogOpen}
                onClose={() => setApprovalDialogOpen(false)}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle>Approval Decision</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {selectedApprovalItem
                      ? `Do you want to approve or reject this ${selectedApprovalItem.type}?`
                      : "Do you want to approve or reject this item?"}
                  </Typography>
                  {selectedApprovalItem && (
                    <Box sx={{ p: 2, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.04)" }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {selectedApprovalItem.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Submitted by: {selectedApprovalItem.submittedBy}
                      </Typography>
                    </Box>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setApprovalDialogOpen(false);
                      setSelectedApprovalItem(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApproveItem(false)}
                    color="error"
                    disabled={isLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproveItem(true)}
                    color="success"
                    variant="contained"
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : "Approve"}
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog
                open={detailsDialogOpen}
                onClose={() => {
                  setDetailsDialogOpen(false);
                  setApprovalItemDetails(null);
                }}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>Item Details</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                  {!approvalItemDetails ? (
                    <Typography color="textSecondary">No details</Typography>
                  ) : approvalItemDetails.event ? (
                    <Box>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                            {approvalItemDetails.event.title}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid key="ev_meta_1" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Type
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.event.type || "-"}
                              </Typography>
                            </Grid>
                            <Grid key="ev_meta_2" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Status
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.event.acceptanceStatus || "-"}
                              </Typography>
                            </Grid>
                            <Grid key="ev_meta_3" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Start
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.event.startTime
                                  ? new Date(approvalItemDetails.event.startTime).toLocaleString()
                                  : "-"}
                              </Typography>
                            </Grid>
                            <Grid key="ev_meta_4" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                End
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.event.endTime
                                  ? new Date(approvalItemDetails.event.endTime).toLocaleString()
                                  : "-"}
                              </Typography>
                            </Grid>
                            <Grid key="ev_meta_5" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Team
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.event.team?.name || "-"}
                              </Typography>
                            </Grid>
                            <Grid key="ev_meta_6" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Team Leader
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.event.teamLeader
                                  ? `${approvalItemDetails.event.teamLeader.fname} ${approvalItemDetails.event.teamLeader.lname}`
                                  : "-"}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>

                      {approvalItemDetails.stats && (
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid key="ev_stat_1" size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                              <CardContent>
                                <Typography color="textSecondary">Registrations</Typography>
                                <Typography variant="h5">
                                  {approvalItemDetails.stats.totalRegistrations ?? 0}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid key="ev_stat_2" size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                              <CardContent>
                                <Typography color="textSecondary">Check-ins</Typography>
                                <Typography variant="h5">
                                  {approvalItemDetails.stats.totalCheckins ?? 0}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid key="ev_stat_3" size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                              <CardContent>
                                <Typography color="textSecondary">Avg Rating</Typography>
                                <Typography variant="h5">
                                  {approvalItemDetails.stats.avgRating ?? 0}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid key="ev_stat_4" size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                              <CardContent>
                                <Typography color="textSecondary">Feedback</Typography>
                                <Typography variant="h5">
                                  {approvalItemDetails.stats.feedbackCount ?? 0}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      )}

                      {approvalItemDetails.room && (
                        <Card sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                              Room
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid key="room_1" size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" color="textSecondary">
                                  Name
                                </Typography>
                                <Typography>{approvalItemDetails.room.name}</Typography>
                              </Grid>
                              <Grid key="room_2" size={{ xs: 12, sm: 3 }}>
                                <Typography variant="body2" color="textSecondary">
                                  Capacity
                                </Typography>
                                <Typography>{approvalItemDetails.room.capacity}</Typography>
                              </Grid>
                              <Grid key="room_3" size={{ xs: 12, sm: 3 }}>
                                <Typography variant="body2" color="textSecondary">
                                  Location
                                </Typography>
                                <Typography>{approvalItemDetails.room.location}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      )}

                      {Array.isArray(approvalItemDetails.speakers) && (
                        <Card sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                              Speakers
                            </Typography>
                            <TableContainer component={Paper}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Contact</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {approvalItemDetails.speakers.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={3} align="center">
                                        <Typography color="textSecondary">No speakers</Typography>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    approvalItemDetails.speakers.map((s: any) => (
                                      <TableRow key={s.id}>
                                        <TableCell>{s.name || `${s.fname || ""} ${s.lname || ""}`}</TableCell>
                                        <TableCell>{s.email || "-"}</TableCell>
                                        <TableCell>{s.contact || "-"}</TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      )}

                      {Array.isArray(approvalItemDetails.registrations) && (
                        <Card>
                          <CardContent>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                              Registrations
                            </Typography>
                            <TableContainer component={Paper}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Checked In</TableCell>
                                    <TableCell>Rating</TableCell>
                                    <TableCell>Date</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {approvalItemDetails.registrations.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={6} align="center">
                                        <Typography color="textSecondary">No registrations</Typography>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    approvalItemDetails.registrations.map((r: any) => (
                                      <TableRow key={`${r.studentId}-${r.dateIssued}`}>
                                        <TableCell>{r.studentName || r.studentId}</TableCell>
                                        <TableCell>{r.email || "-"}</TableCell>
                                        <TableCell>{r.price ?? "-"}</TableCell>
                                        <TableCell>{r.scanned ? "Yes" : "No"}</TableCell>
                                        <TableCell>{r.rating ?? "-"}</TableCell>
                                        <TableCell>
                                          {r.dateIssued ? new Date(r.dateIssued).toLocaleString() : "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  ) : approvalItemDetails.team ? (
                    <Box>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                            {approvalItemDetails.team.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            {approvalItemDetails.team.description || "No description"}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid key="team_meta_1" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Status
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.team.acceptanceStatus || "-"}
                              </Typography>
                            </Grid>
                            <Grid key="team_meta_2" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Subscribers
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.subscribers ?? 0}
                              </Typography>
                            </Grid>
                            <Grid key="team_meta_3" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Leader
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.team.leader
                                  ? `${approvalItemDetails.team.leader.fname} ${approvalItemDetails.team.leader.lname}`
                                  : "-"}
                              </Typography>
                            </Grid>
                            <Grid key="team_meta_4" size={{ xs: 12, sm: 6 }}>
                              <Typography variant="body2" color="textSecondary">
                                Leader Email
                              </Typography>
                              <Typography variant="body1">
                                {approvalItemDetails.team.leader?.email || "-"}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>

                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                            Members
                          </Typography>
                          <TableContainer component={Paper}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Email</TableCell>
                                  <TableCell>Role</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {!Array.isArray(approvalItemDetails.members) ||
                                approvalItemDetails.members.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} align="center">
                                      <Typography color="textSecondary">No members</Typography>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  approvalItemDetails.members.map((m: any) => (
                                    <TableRow key={`${m.studentId}-${m.role}`}>
                                      <TableCell>{`${m.fname || ""} ${m.lname || ""}`}</TableCell>
                                      <TableCell>{m.email || "-"}</TableCell>
                                      <TableCell>{m.role || "-"}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent>
                          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                            Team Events
                          </Typography>
                          <TableContainer component={Paper}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Title</TableCell>
                                  <TableCell>Start</TableCell>
                                  <TableCell>Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {!Array.isArray(approvalItemDetails.events) ||
                                approvalItemDetails.events.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} align="center">
                                      <Typography color="textSecondary">No events</Typography>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  approvalItemDetails.events.map((e: any) => (
                                    <TableRow key={e.id}>
                                      <TableCell>{e.title || "-"}</TableCell>
                                      <TableCell>
                                        {e.startTime ? new Date(e.startTime).toLocaleString() : "-"}
                                      </TableCell>
                                      <TableCell>{e.acceptanceStatus || "-"}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </Box>
                  ) : (
                    <Typography color="textSecondary">Unknown details format</Typography>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setDetailsDialogOpen(false);
                      setApprovalItemDetails(null);
                    }}
                  >
                    Close
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          </TabPanel>

          {/* TAB 1: Admin Management */}
          <TabPanel value={tabValue} index={1}>
            <Box>
              <Box
                sx={{
                  minHeight: "100vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Container maxWidth="sm">
                  <Paper
                    elevation={10}
                    sx={{
                      p: 5,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      borderRadius: 3,
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                    }}
                  >
                    <Typography
                      component="h1"
                      variant="h4"
                      fontWeight="bold"
                      color="primary"
                      gutterBottom
                    >
                      Create Admin Account
                    </Typography>

                    {error && (
                      <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                        {error}
                      </Alert>
                    )}
                    {successMessage && (
                      <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
                        {successMessage}
                      </Alert>
                    )}

                    <Box
                      component="form"
                      onSubmit={handleSubmit(onSubmit)}
                      sx={{ width: "100%" }}
                    >
                      <Grid container spacing={2}>
                        <Grid key="fname" size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            label="First Name"
                            {...register("fname")}
                            error={!!errors.fname}
                            helperText={errors.fname?.message}
                          />
                        </Grid>

                        <Grid key="lname" size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            label="Last Name"
                            {...register("lname")}
                            error={!!errors.lname}
                            helperText={errors.lname?.message}
                          />
                        </Grid>

                        <Grid key="email" size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            {...register("email")}
                            error={!!errors.email}
                            helperText={errors.email?.message}
                          />
                        </Grid>

                        <Grid key="password" size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            {...register("userPassword")}
                            error={!!errors.userPassword}
                            helperText={errors.userPassword?.message}
                          />
                        </Grid>

                        <Grid key="username" size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Username"
                            {...register("username")}
                            error={!!errors.username}
                            helperText={errors.username?.message}
                          />
                        </Grid>

                        <Grid key="bio" size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Bio (Optional)"
                            multiline
                            rows={2}
                            {...register("bio")}
                            error={!!errors.bio}
                            helperText={errors.bio?.message}
                          />
                        </Grid>
                      </Grid>

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        sx={{ mt: 4, mb: 2, py: 1.5 }}
                      >
                        {isLoading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Create"
                        )}
                      </Button>
                    </Box>
                  </Paper>
                </Container>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 4,
                  mb: 2,
                }}
              >
                <Typography variant="h6">Current Admins</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={fetchAdmins}
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={20} /> : "Refresh"}
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adminsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <Typography color="textSecondary">
                            No admins to display
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      adminsList.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell>{`${admin.fname} ${admin.lname}`}</TableCell>
                          <TableCell>{admin.username}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            { admin.id != user.id&&<Button
                              size="small"
                              color="error"
                              onClick={() => handleRemove(admin.id)}
                            >
                              Remove
                            </Button>}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* TAB 2: Reports */}
          <TabPanel value={tabValue} index={2}>
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Generate Reports
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid key="reportType" item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Report Type"
                    value={reportType}
                    onChange={(e) => {
                      setReportType(e.target.value as "participation" | "engagement");
                      setIsReportGenerated(false);
                    }}
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="participation">Participation Report</option>
                    <option value="engagement">Engagement Report</option>
                  </TextField>
                </Grid>

                <Grid key="reportScope" item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Scope"
                    value={reportScope}
                    onChange={(e) => {
                      setReportScope(e.target.value as "event" | "team");
                      setIsReportGenerated(false);
                    }}
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="event">By Event</option>
                    <option value="team">By Team</option>
                  </TextField>
                </Grid>

                <Grid key="timeRange" item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Time Range"
                    value={timeRange}
                    onChange={(e) => {
                      setTimeRange(e.target.value as "week" | "month" | "year" | "all");
                      setIsReportGenerated(false);
                    }}
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </TextField>
                </Grid>

                <Grid key="generateBtn" item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    startIcon={
                      isLoading ? <CircularProgress size={20} color="inherit" /> : null
                    }
                    sx={{ height: '56px' }}
                  >
                    {isLoading ? "Generating..." : "Generate Report"}
                  </Button>
                </Grid>
              </Grid>

              {isReportGenerated && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Showing {reportScope === 'event' ? 'Events' : 'Teams'} for {timeRange === 'week' ? 'Last 7 Days' :
                        timeRange === 'month' ? 'This Month' :
                          timeRange === 'year' ? 'This Year' : 'All Time'}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={handleDownloadReport}
                      disabled={reportData.length === 0}
                    >
                      Download CSV
                    </Button>
                  </Box>

                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>{reportScope === 'event' ? 'Event' : 'Team'} Name</TableCell>
                          <TableCell align="right">Participants</TableCell>
                          {reportType === 'participation' ? (
                            <TableCell align="right">Attendance Rate</TableCell>
                          ) : (
                            <>
                              <TableCell align="right">Engagement Score</TableCell>
                              <TableCell align="right">Feedback Count</TableCell>
                            </>
                          )}
                          <TableCell align="right">Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.length > 0 ? (
                          reportData.map((item) => (
                            <TableRow key={item.id} hover>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">{item.participants}</TableCell>
                              {reportType === 'participation' ? (
                                <TableCell align="right">
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <Box sx={{ width: '100%', maxWidth: '100px', mr: 1 }}>
                                      <Box
                                        sx={{
                                          height: '8px',
                                          backgroundColor: '#e0e0e0',
                                          borderRadius: '4px',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            height: '100%',
                                            width: `${item.attendanceRate}%`,
                                            backgroundColor: (item.attendanceRate ?? 0) >= 80 ? '#4caf50' :
                                              (item.attendanceRate ?? 0) >= 60 ? '#ff9800' : '#f44336',
                                            transition: 'width 0.3s ease'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                    {item.attendanceRate}%
                                  </Box>
                                </TableCell>
                              ) : (
                                <>
                                  <TableCell align="right">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                      <Box sx={{ mr: 1 }}>{item.engagementScore?.toFixed(1)}</Box>
                                      <Box
                                        sx={{
                                          width: '60px',
                                          height: '8px',
                                          backgroundColor: '#e0e0e0',
                                          borderRadius: '4px',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            height: '100%',
                                            width: `${(item.engagementScore || 0) * 20}%`,
                                            backgroundColor: (item.engagementScore || 0) >= 4 ? '#4caf50' :
                                              (item.engagementScore || 0) >= 3 ? '#ff9800' : '#f44336',
                                            transition: 'width 0.3s ease'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">{item.totalInteractions}</TableCell>
                                </>
                              )}
                              <TableCell align="right">
                                {new Date(item.date).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={reportType === 'participation' ? 4 : 5} align="center" sx={{ py: 4 }}>
                              <Typography color="textSecondary">
                                No data available for the selected filters
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {reportData.length > 0 && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary">
                        Showing {reportData.length} {reportScope === 'event' ? 'events' : 'teams'} •
                        Generated on {new Date().toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* TAB 3: Managerial Reports */}
          <TabPanel value={tabValue} index={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Managerial Reports
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                <Typography color="textSecondary">
                  Overall statistics for the whole application
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateManagerialReport}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  {isLoading ? "Generating..." : managerialReport ? "Refresh" : "Generate"}
                </Button>
              </Box>

              {managerialReport && (
                <Grid container spacing={2}>
                  <Grid key="mgr_totalUsers" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Users</Typography>
                        <Typography variant="h5">{managerialReport.totalUsers}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalStudents" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Students</Typography>
                        <Typography variant="h5">{managerialReport.totalStudents}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalAdmins" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Admins</Typography>
                        <Typography variant="h5">{managerialReport.totalAdmins}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalTeams" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Teams</Typography>
                        <Typography variant="h5">{managerialReport.totalTeams}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid key="mgr_totalEvents" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Events</Typography>
                        <Typography variant="h5">{managerialReport.totalEvents}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_approvedEvents" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Approved Events</Typography>
                        <Typography variant="h5">{managerialReport.approvedEvents}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_pendingEvents" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Pending Events</Typography>
                        <Typography variant="h5">{managerialReport.pendingEvents}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_rejectedEvents" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Rejected Events</Typography>
                        <Typography variant="h5">{managerialReport.rejectedEvents}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid key="mgr_totalRegistrations" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Registrations</Typography>
                        <Typography variant="h5">{managerialReport.totalRegistrations}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalCheckins" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Check-ins</Typography>
                        <Typography variant="h5">{managerialReport.totalCheckins}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_checkinRate" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Check-in Rate</Typography>
                        <Typography variant="h5">{managerialReport.checkinRate}%</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_avgRating" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Avg Rating</Typography>
                        <Typography variant="h5">{managerialReport.avgRating}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid key="mgr_avgTicketPrice" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Avg Ticket Price</Typography>
                        <Typography variant="h5">{managerialReport.avgTicketPrice}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_minTicketPrice" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Min Ticket Price</Typography>
                        <Typography variant="h5">{managerialReport.minTicketPrice}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_maxTicketPrice" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Max Ticket Price</Typography>
                        <Typography variant="h5">{managerialReport.maxTicketPrice}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_feedbackCount" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Feedback Count</Typography>
                        <Typography variant="h5">{managerialReport.feedbackCount}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid key="mgr_totalPosts" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Posts</Typography>
                        <Typography variant="h5">{managerialReport.totalPosts}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalComments" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Comments</Typography>
                        <Typography variant="h5">{managerialReport.totalComments}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalMessages" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Messages</Typography>
                        <Typography variant="h5">{managerialReport.totalMessages}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid key="mgr_totalApplications" size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary">Total Applications</Typography>
                        <Typography variant="h5">{managerialReport.totalApplications}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </TabPanel>

          {/* TAB 4: Rooms */}
                    {/* TAB 4: Rooms */}
          <TabPanel value={tabValue} index={4}>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h6">Room Management</Typography>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddRoomDialogOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    Add Room
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={fetchRooms}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : "Refresh"}
                  </Button>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {successMessage}
                </Alert>
              )}

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell></TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roomsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            No rooms available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      roomsList.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell>{room.id}</TableCell>
                          <TableCell>{room.name}</TableCell>
                          <TableCell>{room.capacity}</TableCell>
                          <TableCell>{room.location || "-"}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleRoomRemove(room.id)}
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

              <Dialog
                open={addRoomDialogOpen}
                onClose={() => {
                  setAddRoomDialogOpen(false);
                  setRoomName("");
                  setRoomCapacity(0);
                  setRoomLocation("");
                }}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle>Add New Room</DialogTitle>
                <DialogContent>
                  <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Room Name"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      required
                    />
                    <TextField
                      fullWidth
                      label="Capacity"
                      type="number"
                      value={roomCapacity}
                      onChange={(e) => setRoomCapacity(parseInt(e.target.value) || 0)}
                      required
                    />
                    <TextField
                      fullWidth
                      label="Location (Optional)"
                      value={roomLocation}
                      onChange={(e) => setRoomLocation(e.target.value)}
                    />
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setAddRoomDialogOpen(false);
                      setRoomName("");
                      setRoomCapacity(0);
                      setRoomLocation("");
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAddRoom}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : "Add Room"}
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
            
        <Typography variant="h6" sx={{mt:3, mb:3}}>Speakers</Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddSpeakerDialogOpen(true)}
          >
            Add Speaker
          </Button>
        </Box>
        <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Bio</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {speakerssList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}> {/* Changed from 4 to 8 */}
                          <Typography color="textSecondary">
                            No speakers available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      speakerssList.map((speaker) => (
                        <TableRow key={speaker.id}>
                          
                          
                          <TableCell>{speaker.name}</TableCell>
                          <TableCell>{speaker.email}</TableCell>
                          <TableCell>{speaker.bio || "-"}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleSpeakerRemove(speaker.id)}
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
              <Dialog
  open={addSpeakerDialogOpen}
  onClose={() => {
    setAddSpeakerDialogOpen(false);
    setSpeakerName("");
    setSpeakerEmail("");
    setSpeakerBio("");
    setSpeakerFname("");
    setSpeakerLname("");
    setSpeakerContact("");
  }}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Add New Speaker</DialogTitle>
  <DialogContent>
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        fullWidth
        label="Speaker Name"
        value={speakerName}
        onChange={(e) => setSpeakerName(e.target.value)}
        required
      />
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={speakerEmail}
        onChange={(e) => setSpeakerEmail(e.target.value)}
        required
      />
      <TextField
        fullWidth
        label="First Name (Optional)"
        value={speakerFname}
        onChange={(e) => setSpeakerFname(e.target.value)}
      />
      <TextField
        fullWidth
        label="Last Name (Optional)"
        value={speakerLname}
        onChange={(e) => setSpeakerLname(e.target.value)}
      />
      <TextField
        fullWidth
        label="Bio (Optional)"
        multiline
        rows={3}
        value={speakerBio}
        onChange={(e) => setSpeakerBio(e.target.value)}
      />
      <TextField
        fullWidth
        label="Contact Number (Optional)"
        type="number"
        value={speakerContact}
        onChange={(e) => setSpeakerContact(e.target.value ? parseInt(e.target.value) : "")}
      />
    </Box>
  </DialogContent>
  <DialogActions>
    <Button
      onClick={() => {
        setAddSpeakerDialogOpen(false);
        setSpeakerName("");
        setSpeakerEmail("");
        setSpeakerBio("");
        setSpeakerFname("");
        setSpeakerLname("");
        setSpeakerContact("");
      }}
      disabled={isLoading}
    >
      Cancel
    </Button>
    <Button
      variant="contained"
      onClick={handleAddSpeaker}
      disabled={isLoading}
    >
      {isLoading ? <CircularProgress size={20} /> : "Add Speaker"}
    </Button>
  </DialogActions>
</Dialog>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}