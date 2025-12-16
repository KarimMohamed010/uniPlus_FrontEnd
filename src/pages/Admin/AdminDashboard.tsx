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
  const [reportType, setReportType] = useState<"participation" | "engagement">(
    "participation"
  );
  const [reportData, setReportData] = useState<
    Array<{
      id: string | number;
      name: string;
      value: number | string;
    }>
  >([]);

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
      const endpoint =
        reportType === "participation"
          ? "/admin/reports/participation"
          : "/admin/reports/engagement";
      const response = await client.get(endpoint);
      setReportData(response.data.report.events || []);
      setSuccessMessage("Report generated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    // TODO: Implement CSV/PDF download functionality
    console.log("Downloading report...");
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
                <Grid key="reportType" size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Report Type"
                    value={reportType}
                    onChange={(e) =>
                      setReportType(
                        e.target.value as "participation" | "engagement"
                      )
                    }
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="participation">Participation Report</option>
                    <option value="engagement">Engagement Report</option>
                  </TextField>
                </Grid>
                <Grid key="generateBtn" size={{ xs: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    sx={{ mt: 1 }}
                    startIcon={
                      isLoading ? <CircularProgress size={20} /> : undefined
                    }
                  >
                    {isLoading ? "Generating..." : "Generate Report"}
                  </Button>
                </Grid>
              </Grid>

              {reportData.length > 0 && (
                <Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={handleDownloadReport}
                    >
                      Download Report
                    </Button>
                  </Box>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                          <TableCell>Event Name</TableCell>
                          <TableCell align="right">
                            {reportType === "participation"
                              ? "Participants"
                              : "Engagement Score"}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="right">{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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
          <TabPanel value={tabValue} index={5}></TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
