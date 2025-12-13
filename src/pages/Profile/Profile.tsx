import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    fname: user?.fname || "",
    lname: user?.lname || "",
    email: user?.email || "",
    username: user?.username || "",
    bio: user?.bio || "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Add API call to update profile
      // await client.patch('/users/profile', formData);
      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fname: user?.fname || "",
      lname: user?.lname || "",
      email: user?.email || "",
      username: user?.username || "",
      bio: user?.bio || "",
    });
    setIsEditing(false);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent
              sx={{ display: "flex", alignItems: "center", gap: 3, pb: 3 }}
            >
              <Avatar
                src={user?.imgUrl}
                sx={{ width: 120, height: 120, fontSize: "3rem" }}
              >
                {user?.fname.charAt(0).toUpperCase()}
                {user?.lname.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5">
                  {user?.fname} {user?.lname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{user?.username}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                  {user?.bio || "No bio added yet"}
                </Typography>
              </Box>
              <Button
                variant={isEditing ? "outlined" : "contained"}
                onClick={() =>
                  isEditing ? handleCancel() : setIsEditing(true)
                }
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Profile Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="fname"
                  value={formData.fname}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lname"
                  value={formData.lname}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                  multiline
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </Grid>
            </Grid>

            {isEditing && (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mt: 3,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : undefined
                  }
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Account Statistics (Optional) */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Teams Joined
                  </Typography>
                  <Typography variant="h5">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Events Attended
                  </Typography>
                  <Typography variant="h5">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Posts Created
                  </Typography>
                  <Typography variant="h5">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Member Since
                  </Typography>
                  <Typography variant="body2">
                    {new Date().toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
