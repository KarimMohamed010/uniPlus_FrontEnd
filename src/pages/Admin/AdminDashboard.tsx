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
  Chip,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  Download,
  Send,
  Search,
  Warning,
  Person,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Event/Organization Approval States
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Admin Management States
  const [adminSearch, setAdminSearch] = useState("");
  const [searchedAdmin, setSearchedAdmin] = useState<any>(null);

  // Reports States
  const [reportType, setReportType] = useState<"participation" | "engagement">(
    "participation"
  );
  const [reportData, setReportData] = useState<any[]>([]);

  // Behavior Warning States
  const [warningUserId, setWarningUserId] = useState("");
  const [warningReason, setWarningReason] = useState("");

  // User Management States
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Announcement States
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

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
  const handleSearchAdmin = async () => {
    if (!adminSearch.trim()) return;
    try {
      setIsLoading(true);
      const response = await client.get(`/users/${adminSearch}`);
      setSearchedAdmin(response.data.user);
    } catch (error) {
      console.error("Failed to search admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!searchedAdmin) return;
    try {
      setIsLoading(true);
      await client.post("/admin", { userId: searchedAdmin.id });
      setSuccessMessage("Admin added successfully!");
      setAdminSearch("");
      setSearchedAdmin(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to add admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
  const handleToggleUserStatus = async (userId: string) => {
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
  const handleSendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) return;
    try {
      setIsLoading(true);
      await client.post("/admin/announcements", {
        title: announcementTitle,
        message: announcementMessage,
      });
      setSuccessMessage("Announcement sent successfully!");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to send announcement:", error);
    } finally {
      setIsLoading(false);
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
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

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
            <Tab label="Admin Management" id="admin-tab-1" />
            <Tab label="Reports" id="admin-tab-2" />
            <Tab label="Behavior Warnings" id="admin-tab-3" />
            <Tab label="User Management" id="admin-tab-4" />
            <Tab label="Announcements" id="admin-tab-5" />
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
                    {true ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            No pending approvals
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
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
                <DialogTitle>
                  {selectedItem?.name} - Approval Decision
                </DialogTitle>
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
                    onClick={() => handleApproveItem(selectedItem?.id, false)}
                    color="error"
                    disabled={isLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproveItem(selectedItem?.id, true)}
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
              <Typography variant="h6" sx={{ mb: 3 }}>
                Add New Admin
              </Typography>

              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  placeholder="Search by username or email..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleSearchAdmin}
                          disabled={isLoading}
                        >
                          <Search />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {searchedAdmin && (
                <Card sx={{ mb: 3, backgroundColor: "#f9f9f9" }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1">
                          {searchedAdmin.fname} {searchedAdmin.lname}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          @{searchedAdmin.username}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {searchedAdmin.email}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleAddAdmin}
                        disabled={isLoading}
                        startIcon={
                          isLoading ? <CircularProgress size={20} /> : undefined
                        }
                      >
                        {isLoading ? "Adding..." : "Make Admin"}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                Current Admins
              </Typography>
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
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <Typography color="textSecondary">
                          No admins to display
                        </Typography>
                      </TableCell>
                    </TableRow>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="User ID or Username"
                      placeholder="Enter user ID or username"
                      value={warningUserId}
                      onChange={(e) => setWarningUserId(e.target.value)}
                      disabled={isLoading}
                    />
                  </Grid>
                  <Grid item xs={12}>
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
                  <Grid item xs={12}>
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
                    {true ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <Typography color="textSecondary">
                            No warnings issued
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
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
                    {true ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            No users to display
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* TAB 5: Announcements */}
          <TabPanel value={tabValue} index={5}>
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Send System Announcement
              </Typography>

              <Card sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Announcement Title"
                      placeholder="e.g., System Maintenance Notice"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      disabled={isLoading}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Message"
                      placeholder="Enter your announcement message..."
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      multiline
                      rows={5}
                      disabled={isLoading}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSendAnnouncement}
                      disabled={
                        isLoading || !announcementTitle || !announcementMessage
                      }
                      startIcon={
                        isLoading ? <CircularProgress size={20} /> : <Send />
                      }
                    >
                      {isLoading ? "Sending..." : "Send Announcement"}
                    </Button>
                  </Grid>
                </Grid>
              </Card>

              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Announcements
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper sx={{ p: 3, textAlign: "center" }}>
                  <Typography color="textSecondary">
                    No announcements sent yet
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
