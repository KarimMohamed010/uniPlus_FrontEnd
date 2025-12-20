import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Chat as ChatIcon,
  AccountCircle,
  AdminPanelSettings as AdminIcon,
  Notifications,
  Camera,
  Message,
  CarCrash,
  DirectionsCar,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import Badge from "@mui/material/Badge";
import { format } from "date-fns";
import UserSearch from "./UserSearch";

const drawerWidth = 240;

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount, unreadMessages } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileAnchorEl, setProfileAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] =
    React.useState<null | HTMLElement>(null);

  const [customTitle, setCustomTitle] = React.useState<string | null>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileClose();
    logout();
    navigate("/login");
  };

  const navItems = [
    { text: "Home Feed", icon: <HomeIcon />, path: "/" },
    // { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Teams", icon: <GroupIcon />, path: "/teams" },
    { text: "Events", icon: <EventIcon />, path: "/events" },
    { text: "Chat", icon: <ChatIcon />, path: "/chat" },
    ...(user?.roles.global === "student" ? [{ text: "Rides", icon: <DirectionsCar />, path: "/rides" }] : []),
    ...(user?.roles.global === "admin"
      ? [{ text: "Admin", icon: <AdminIcon />, path: "/admin" }]
      : []),
    ...(user?.roles.global === "student" && user?.roles.team?.length > 0
      ? [{ text: "Organizers Dashboard", icon: <Camera />, path: "/student-teams" }]
      : []),
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: "center" }}>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          Uni+
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: "background.paper",
          color: "text.primary",
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {customTitle || navItems.find((i) => i.path === location.pathname)?.text ||
              ""}
          </Typography>

          <UserSearch />

          <div>
            <IconButton
              size="large"
              aria-label="show new notifications"
              color="inherit"
              onClick={handleNotificationMenu}
            >
              <Badge badgeContent={unreadCount} color="error">
                <Message />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notificationAnchorEl}
              open={Boolean(notificationAnchorEl)}
              onClose={handleNotificationClose}
              PaperProps={{
                sx: { width: 360, maxHeight: 400 },
              }}
            >
              {unreadMessages.length > 0 ? (
                <>
                  {unreadMessages.map((msg) => (
                    <MenuItem
                      key={msg.msgId}
                      onClick={() => {
                        navigate("/chat", {
                          state: { activeChatId: msg.senderId },
                        });
                        handleNotificationClose();
                      }}
                      sx={{ whiteSpace: "normal", py: 1.5 }}
                    >
                      <ListItemAvatar>
                        <Avatar src={msg.senderImgUrl}>
                          {msg.senderName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {msg.senderName}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {msg.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(msg.sentAt), "MMM d, h:mm a")}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      navigate("/chat");
                      handleNotificationClose();
                    }}
                    sx={{ justifyContent: "center", color: "primary.main" }}
                  >
                    View All Messages
                  </MenuItem>
                </>
              ) : (
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    No new messages
                  </Typography>
                </MenuItem>
              )}
            </Menu>
            <Tooltip title={`${user?.username}`} arrow>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleProfileMenu}
                color="inherit"
              >
                {user?.imgUrl ? (
                  <Avatar src={user.imgUrl} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={profileAnchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(profileAnchorEl)}
              onClose={handleProfileClose}
            >
              <MenuItem
                onClick={() => {
                  navigate("/profile");
                  handleProfileClose();
                }}
              >
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>Log Out</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "none",
              boxShadow: 1,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Toolbar />
        <Outlet context={{ setCustomTitle }} />
      </Box>
    </Box>
  );
}
