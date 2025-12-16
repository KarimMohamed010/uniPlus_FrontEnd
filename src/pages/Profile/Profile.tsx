import React, { useState, useRef, useEffect } from "react";
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
  InputAdornment,
  IconButton,
  Collapse,
} from "@mui/material";
import { Visibility, VisibilityOff, Message as MessageIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { FileUploaderRegular } from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';
import { useParams, useOutletContext, useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { setCustomTitle } = useOutletContext<{ setCustomTitle: (title: string | null) => void }>();
  const uploaderRef = useRef<any>(null);
  const latestFileRef = useRef<any>(null);

  const [viewedUser, setViewedUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // ... existing state ...

  // Update title when viewedUser changes
  useEffect(() => {
    if (viewedUser) {
      setCustomTitle(`${viewedUser.fname} ${viewedUser.lname} Profile`);
    } else {
      setCustomTitle(null);
    }
    return () => setCustomTitle(null);
  }, [viewedUser, setCustomTitle]);
  // ... existing fetchUser useEffect ...

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [posts, setPosts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    bio: "",
    username: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      if (userId && parseInt(userId) !== user?.id) {
        // Viewing another user
        try {
          const res = await client.get(`/users/id/${userId}`);
          setViewedUser(res.data.user);
          setIsOwner(false);
          setFormData({
            fname: res.data.user.fname || "",
            lname: res.data.user.lname || "",
            email: res.data.user.email || "",
            bio: res.data.user.bio || "",
            username: res.data.user.username || "",
          });
        } catch (err) {
          console.error("Failed to fetch user:", err);
          setErrorMessage("User not found");
          setViewedUser(null);
        }
      } else {
        // Viewing own profile
        setViewedUser(user);
        setIsOwner(true);
        if (user) {
          setFormData({
            fname: user.fname || "",
            lname: user.lname || "",
            email: user.email || "",
            bio: user.bio || "",
            username: user.username || "",
          });
        }
      }
      setIsLoadingUser(false);
    };

    fetchUser();
  }, [userId, user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!viewedUser?.id) return;

      setLoadingPosts(true);
      setLoadingTeams(true);

      try {
        const postsRes = await client.get(`/posts/user/${viewedUser.id}`);
        setPosts(postsRes.data.posts);
      } catch (e) {
        console.error("Failed to fetch posts", e);
      } finally {
        setLoadingPosts(false);
      }

      try {
        const teamsRes = await client.get(`/teams/user/${viewedUser.id}`);
        setTeams(teamsRes.data);
      } catch (e) {
        console.error("Failed to fetch teams", e);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchUserData();
  }, [viewedUser]);


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

      const res = await client.patch('/users/profile', formData)
      updateUser({ ...user, ...res.data.user })
      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      setErrorMessage("Failed to update profile. Please try again. " + error.response.data.error);
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (viewedUser) {
      setFormData({
        fname: viewedUser.fname || "",
        lname: viewedUser.lname || "",
        email: viewedUser.email || "",
        username: viewedUser.username || "",
        bio: viewedUser.bio || "",
      });
    }
    setIsEditing(false);
  };

  const validatePassword = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return false;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    try {
      await client.patch("/users/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setSuccessMessage("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Failed to change password:", error);
      setPasswordError("Failed to change password. " + error.response?.data?.error || "");
      setTimeout(() => setPasswordError(""), 3000);

    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isLoadingUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!viewedUser) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
        <Alert severity="error">User not found</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Collapse in={!!successMessage}>
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      </Collapse>
      <Collapse in={!!errorMessage}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      </Collapse>

      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent
              sx={{ display: "flex", alignItems: "center", gap: 3, pb: 3 }}
            >
              <Avatar
                src={viewedUser?.imgUrl}
                sx={{ width: 120, height: 120, fontSize: "3rem" }}
              >
                {viewedUser?.fname.charAt(0).toUpperCase()}
                {viewedUser?.lname.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5">
                  {viewedUser?.fname} {viewedUser?.lname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewedUser?.username}
                </Typography>
                {viewedUser?.email && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {viewedUser.email}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                  {viewedUser?.bio || "No bio added yet"}
                </Typography>

                {!isOwner && (
                  <Button
                    variant="contained"
                    startIcon={<MessageIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => {
                      navigate("/chat", {
                        state: { activeChatId: viewedUser.id },
                      });
                    }}
                  >
                    Message
                  </Button>
                )}

                {isOwner && (
                  <>
                    <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
                      Change Profile Picture
                    </Typography>
                    <FileUploaderRegular
                      apiRef={uploaderRef}
                      sourceList="local,camera,gdrive"
                      classNameUploader="uc-light"
                      pubkey="1ed9d5259738cb825f1c"
                      cropPreset="1:1"
                      onChange={(items) => {
                        const successFile = items.allEntries.find(
                          (f) => f.status === "success"
                        );
                        if (successFile) {
                          latestFileRef.current = successFile;
                          console.log("File changed/uploaded:", successFile.cdnUrl);
                        }
                      }}
                      onDoneClick={() => {
                        if (latestFileRef.current && user) {
                          client
                            .patch("/users/profile-pic", {
                              imgUrl: latestFileRef.current.cdnUrl,
                            })
                            .then(() => {
                              console.log("Profile picture updated on Done click");
                              updateUser({ ...user, imgUrl: latestFileRef.current.cdnUrl });
                              setSuccessMessage("Profile picture updated!");
                              setTimeout(() => setSuccessMessage(""), 3000);
                              latestFileRef.current = null;
                            })
                            .catch((err) => {
                              console.error("Failed to update profile pic:", err);
                            });
                        }
                      }}
                      multiple={false}
                      imgOnly={true}
                      useCloudImageEditor={true}
                    />

                    {user?.imgUrl && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={() => {
                          if (user) {
                            client
                              .patch("/users/profile-pic", {
                                imgUrl: null,
                              })
                              .then(() => {
                                updateUser({ ...user, imgUrl: undefined });
                                setSuccessMessage("Profile picture removed!");
                                setTimeout(() => setSuccessMessage(""), 3000);
                              })
                              .catch((err) => {
                                console.error("Failed to remove profile pic:", err);
                              });
                          }
                        }}
                      >
                        Remove Picture
                      </Button>
                    )}
                  </>
                )}
              </Box>

            </CardContent>
          </Card>
        </Grid>

        {/* Profile Information (Owner Only) */}
        {isOwner && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Profile Information
                </Typography>
                {isOwner && (
                  <Button
                    variant={isEditing ? "outlined" : "contained"}
                    onClick={() =>
                      isEditing ? handleCancel() : setIsEditing(true)
                    }
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />


              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
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
                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12 }}>
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
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    variant={isEditing ? "outlined" : "filled"}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
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
        )}

        {/* Change Password Section (Owner Only) */}
        {isOwner && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Security</Typography>
                <Button
                  variant={showPasswordForm ? "outlined" : "contained"}
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setPasswordError("");
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                >
                  {showPasswordForm ? "Cancel" : "Change Password"}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {showPasswordForm ? (
                <Box>
                  {passwordError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {passwordError}
                    </Alert>
                  )}

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        name="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        disabled={isLoading}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() =>
                                  togglePasswordVisibility("current")
                                }
                                edge="end"
                                disabled={isLoading}
                              >
                                {showPasswords.current ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        disabled={isLoading}
                        helperText="Minimum 6 characters"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => togglePasswordVisibility("new")}
                                edge="end"
                                disabled={isLoading}
                              >
                                {showPasswords.new ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        name="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        disabled={isLoading}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() =>
                                  togglePasswordVisibility("confirm")
                                }
                                edge="end"
                                disabled={isLoading}
                              >
                                {showPasswords.confirm ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>

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
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordError("");
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleChangePassword}
                      disabled={isLoading}
                      startIcon={
                        isLoading ? <CircularProgress size={20} /> : undefined
                      }
                    >
                      {isLoading ? "Changing..." : "Change Password"}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Keep your account secure by changing your password regularly
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* User's Posts */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Shared Posts</Typography>
          {loadingPosts ? (
            <CircularProgress />
          ) : posts.length > 0 ? (
            <Grid container spacing={2}>
              {posts.map((post: any) => (
                <Grid size={{ xs: 12, md: 6 }} key={post.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        {post.team.name}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {post.description}
                      </Typography>
                      {post.media && post.media.length > 0 && (
                        <Box sx={{ mt: 2, maxHeight: 200, overflow: 'hidden' }}>
                          <img src={post.media[0].url} alt="post media" style={{ width: '100%', objectFit: 'cover' }} />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No posts shared yet.</Typography>
          )}
        </Grid>

        {/* User's Teams */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Subscribed Teams</Typography>
          {loadingTeams ? (
            <CircularProgress />
          ) : teams.length > 0 ? (
            <Grid container spacing={2}>
              {teams.map((team: any) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{team.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {team.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">Not subscribed to any teams.</Typography>
          )}
        </Grid>


        {/* Account Statistics (Optional) 
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Teams Joined
                  </Typography>
                  <Typography variant="h5">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Events Attended
                  </Typography>
                  <Typography variant="h5">0</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography color="textSecondary" gutterBottom>
                    Posts Created
                  </Typography>
                  <Typography variant="h5">0</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        */}
      </Grid>
    </Box>
  );
}
