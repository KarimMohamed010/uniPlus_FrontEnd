import React, { useState } from "react";
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
  InputAdornment,
  Container,
} from "@mui/material";
import { Download, Search, Warning } from "@mui/icons-material";
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
  const [approvalReason, setApprovalReason] = useState("");
  const [pendingApprovals] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
      submittedBy: string;
      date: string;
    }>
  >([]);

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

  // Behavior Warning States
  const [warningUserId, setWarningUserId] = useState("");
  const [warningReason, setWarningReason] = useState("");
  const [recentWarnings] = useState<
    Array<{
      id: string | number;
      user: string;
      reason: string;
      issuedDate: string;
      status: string;
    }>
  >([]);

  // User Management States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [users] = useState<
    Array<{
      id: string | number;
      name: string;
      username: string;
      email: string;
      role: string;
      status: string;
    }>
  >([]);

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

  // Handlers for Event/Organization Approval
  const handleApproveItem = async (itemId: string, approved: boolean) => {
    try {
      setIsLoading(true);
      await client.patch(`/admin/approvals/${itemId}`, {
        approved,
        reason: approvalReason,
        itemType: "event",
      });
      setSuccessMessage(
        `Item ${approved ? "approved" : "rejected"} successfully!`
      );
      setApprovalDialogOpen(false);
      setApprovalReason("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to process approval:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Admin Management
  // These handlers are available for future use in admin management features

  // Handlers for Reports
  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Make API call to get the report data
      const response = await client.get(`/reports/${reportType}`, {
        params: {
          scope: reportScope,
          timeRange: timeRange
        }
      });
      
      // Transform the API response to match our frontend data structure
      const apiData = response.data.data || [];
      
      // Format the data for the table
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
      // Convert report data to CSV
      const headers = [];
      const dataRows = [];
      
      // Add headers based on report type
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
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...dataRows
      ].join('\n');
      
      // Create download link
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

  // Handlers for Behavior Warnings
  const handleIssueWarning = async () => {
    if (!warningUserId || !warningReason) return;
    try {
      setIsLoading(true);
      await client.post("/admin/warnings", {
        userId: warningUserId,
        reason: warningReason,
      });
      setSuccessMessage("Warning issued successfully!");
      setWarningUserId("");
      setWarningReason("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to issue warning:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for User Management
  const handleToggleUserStatus = async (userId: string | number) => {
    try {
      setIsLoading(true);
      await client.patch(`/admin/users/${userId}/status`);
      setSuccessMessage("User status updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Announcements
  // This handler is available for sending system announcements to all users;;

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
      {/* {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )} */}

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
            <Tab label="Event/Org Approvals" id="admin-tab-0" />
            <Tab label="Add Admin" id="admin-tab-1" />
            <Tab label="Reports" id="admin-tab-2" />
            <Tab label="Behavior Warnings" id="admin-tab-3" />
            <Tab label="User Management" id="admin-tab-4" />
            <Tab label="Managerial Reports" id="admin-tab-5" />
          </Tabs>

          {/* TAB 0: Event/Organization Approvals */}
          <TabPanel value={tabValue} index={0}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Pending Approvals
              </Typography>
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
                          <TableCell>{item.date}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => setApprovalDialogOpen(true)}
                            >
                              Review
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
                  <TextField
                    fullWidth
                    label="Reason (Optional)"
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Add a reason for approval or rejection..."
                  />
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => setApprovalDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApproveItem("1", false)}
                    color="error"
                    disabled={isLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproveItem("1", true)}
                    color="success"
                    variant="contained"
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : "Approve"}
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
                  // background:
                  //   "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  // p: 2,
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

                        {/* NEW USERNAME FIELD */}
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
                            <Button
                              size="small"
                              color="error"
                              onClick={()=>handleRemove(admin.id )}
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
                                            backgroundColor: item.attendanceRate >= 80 ? '#4caf50' : 
                                                          item.attendanceRate >= 60 ? '#ff9800' : '#f44336',
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

          {/* TAB 3: Behavior Warnings */}
          <TabPanel value={tabValue} index={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Issue Behavior Warning
              </Typography>

              <Card sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2}>
                  <Grid key="warningUserId" size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="User ID or Username"
                      placeholder="Enter user ID or username"
                      value={warningUserId}
                      onChange={(e) => setWarningUserId(e.target.value)}
                      disabled={isLoading}
                    />
                  </Grid>
                  <Grid key="warningReason" size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Warning Reason"
                      placeholder="Describe the reason for this warning"
                      value={warningReason}
                      onChange={(e) => setWarningReason(e.target.value)}
                      multiline
                      rows={4}
                      disabled={isLoading}
                    />
                  </Grid>
                  <Grid key="warningBtn" size={{ xs: 12 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="warning"
                      onClick={handleIssueWarning}
                      disabled={isLoading || !warningUserId || !warningReason}
                      startIcon={
                        isLoading ? <CircularProgress size={20} /> : <Warning />
                      }
                    >
                      {isLoading ? "Issuing..." : "Issue Warning"}
                    </Button>
                  </Grid>
                </Grid>
              </Card>

              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Warnings
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell>User</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Issued Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentWarnings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <Typography color="textSecondary">
                            No warnings issued
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentWarnings.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell>{warning.user}</TableCell>
                          <TableCell>{warning.reason}</TableCell>
                          <TableCell>{warning.issuedDate}</TableCell>
                          <TableCell>{warning.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* TAB 4: User Management */}
          <TabPanel value={tabValue} index={4}>
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                User Management
              </Typography>

              <TextField
                fullWidth
                placeholder="Search users by name, username, or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            No users to display
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>{user.status}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
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
        </CardContent>
      </Card>
    </Box>
  );
}
