import { useState, useEffect } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Snackbar,
} from "@mui/material";
import {
  Add,
  Search,
  LocationOn,
  AccessTime,
  AttachMoney,
  People,
  DirectionsCar,
  Delete,
  PersonAdd,
  PersonRemove,
  Clear,
  Info,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";

interface Driver {
  id: number;
  fname: string;
  lname: string;
  imgUrl?: string;
}

interface Ride {
  id: number;
  toLoc: string;
  fromLoc: string;
  price: number;
  seatsAvailable: number;
  arrivalTime: string;
  service: string;
  driver: Driver;
}

interface RideResponse {
  message: string;
  rides: Ride[];
}

interface Passenger {
  id: number;
  fname: string;
  lname: string;
  imgUrl?: string;
}

interface RideDetails {
  id: number;
  toLoc: string;
  fromLoc: string;
  price: number;
  seatsAvailable: number;
  arrivalTime: string;
  service: string;
  driver: Driver;
  passengers: Passenger[];
}

interface RideDetailsResponse {
  message: string;
  ride: RideDetails;
}

function stringToColor(string: string) {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name: string) {
  if (!name) {
    return {
      sx: {
        bgcolor: stringToColor("?"),
      },
      children: "?",
    };
  }
  const nameParts = name.split(" ");
  const firstNameInitial = nameParts[0]?.[0] || "";
  const lastNameInitial = nameParts[1]?.[0] || "";
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${firstNameInitial}${lastNameInitial}`.toUpperCase(),
  };
}

export default function Rides() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning",
  });
  const [joinedRides, setJoinedRides] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [detailsRideId, setDetailsRideId] = useState<number | null>(null);

  // Input states (for controlled inputs)
  const [inputTo, setInputTo] = useState("");
  const [inputFrom, setInputFrom] = useState("");
  const [inputMaxPrice, setInputMaxPrice] = useState("");
  const [inputDate, setInputDate] = useState("");

  // Query parameter states (used for actual API calls)
  const [searchTo, setSearchTo] = useState("");
  const [searchFrom, setSearchFrom] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Create ride form state
  const [createForm, setCreateForm] = useState({
    toLoc: "",
    fromLoc: "",
    price: "",
    seatsAvailable: "",
    arrivalDate: "",
    arrivalTime: "",
    service: "",
  });

  // Debounce effect for search inputs
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTo(inputTo);
      setSearchFrom(inputFrom);
      setMaxPrice(inputMaxPrice);
      setDateFilter(inputDate);
    }, 700); // 500ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [inputTo, inputFrom, inputMaxPrice, inputDate]);

  // Fetch all rides with filters
  const { data: ridesData, isLoading } = useQuery<RideResponse>({
    queryKey: ["rides", searchTo, searchFrom, maxPrice, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTo) params.append("to", searchTo);
      if (searchFrom) params.append("from", searchFrom);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (dateFilter) params.append("date", dateFilter);
      params.append("availableOnly", "true");

      const res = await client.get(`/rides?${params.toString()}`);
      return res.data;
    },
  });

  const rides = ridesData?.rides || [];

  // Fetch ride details with passengers
  const { data: rideDetailsData, isLoading: isLoadingDetails } = useQuery<RideDetailsResponse>({
    queryKey: ["rideDetails", detailsRideId],
    queryFn: async () => {
      if (!detailsRideId) return null;
      const res = await client.get(`/rides/${detailsRideId}`);
      return res.data;
    },
    enabled: !!detailsRideId,
  });

  const rideDetails = rideDetailsData?.ride;

  // Fetch user's joined rides to determine status
  useEffect(() => {
    const fetchJoinedRides = async () => {
      try {
        // We'll need to check each ride individually or have a separate endpoint
        // For now, we'll track joins/leaves locally
        const res = await client.get(`/rides/joined`);
        setJoinedRides(new Set(res.data.joinedRides.map((ride: any) => ride.rideId)));
      } catch (error) {
        console.error("Error fetching joined rides:", error);
    }
  };
  fetchJoinedRides();
  }, []);

  // Create ride mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      toLoc: string;
      fromLoc: string;
      price: number;
      seatsAvailable: number;
      arrivalTime: string;
      service: string;
    }) => {
      return await client.post("/rides", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      setOpenCreate(false);
      setCreateForm({
        toLoc: "",
        fromLoc: "",
        price: "",
        seatsAvailable: "",
        arrivalDate: "",
        arrivalTime: "",
        service: "",
      });
      showSnackbar("Ride created successfully!", "success");
    },
    onError: (error: any) => {
      showSnackbar(
        error.response?.data?.error || "Failed to create ride",
        "error"
      );
    },
  });

  // Join ride mutation
  const joinMutation = useMutation({
    mutationFn: async (rideId: number) => {
      return await client.post(`/rides/${rideId}/join`);
    },
    onSuccess: (_, rideId) => {
      setJoinedRides((prev) => new Set(prev).add(rideId));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      showSnackbar("Successfully joined the ride!", "success");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error || "Failed to join ride";
      showSnackbar(message, "error");
    },
  });

  // Leave ride mutation
  const leaveMutation = useMutation({
    mutationFn: async (rideId: number) => {
      return await client.delete(`/rides/${rideId}/leave`);
    },
    onSuccess: (_, rideId) => {
      setJoinedRides((prev) => {
        const newSet = new Set(prev);
        newSet.delete(rideId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      showSnackbar("Left the ride successfully", "warning");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error || "Failed to leave ride";
      showSnackbar(message, "error");
    },
  });

  // Delete ride mutation
  const deleteMutation = useMutation({
    mutationFn: async (rideId: number) => {
      return await client.delete(`/rides/${rideId}`);
    },
    onSuccess: (_, rideId) => {
      queryClient.setQueryData<RideResponse>(
        ["rides", searchTo, searchFrom, maxPrice, dateFilter],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            rides: oldData.rides.filter((r) => r.id !== rideId),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      showSnackbar("Ride deleted successfully", "success");
      setDeletingId(null);
    },
    onError: (error: any) => {
      showSnackbar(
        error.response?.data?.error || "Failed to delete ride",
        "error"
      );
      setDeletingId(null);
    },
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "warning"
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCreate = () => {
    if (
      !createForm.toLoc ||
      !createForm.fromLoc ||
      !createForm.price ||
      !createForm.seatsAvailable ||
      !createForm.arrivalDate ||
      !createForm.arrivalTime ||
      !createForm.service
    ) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    // Combine date and time into ISO string
    const arrivalDateTime = `${createForm.arrivalDate}T${createForm.arrivalTime}`;

    createMutation.mutate({
      toLoc: createForm.toLoc,
      fromLoc: createForm.fromLoc,
      price: parseFloat(createForm.price),
      seatsAvailable: parseInt(createForm.seatsAvailable),
      arrivalTime: arrivalDateTime,
      service: createForm.service,
    });
  };

  const handleClearSearch = () => {
    setInputTo("");
    setInputFrom("");
    setInputMaxPrice("");
    setInputDate("");
  };

  // Prevent typing in date/time inputs
  const preventTyping = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Tab" && e.key !== "Escape" && e.key !== "Enter") {
      e.preventDefault();
    }
  };

  // Prevent negative numbers
  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: "price" | "seatsAvailable"
  ) => {
    const value = e.target.value;
    // Allow empty string or positive numbers
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setCreateForm({ ...createForm, [field]: value });
    }
  };

  // Prevent negative numbers in search
  const handleSearchNumberChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setInputMaxPrice(value);
    }
  };

  const handleJoin = (rideId: number) => {
    joinMutation.mutate(rideId);
  };

  const handleLeave = (rideId: number) => {
    leaveMutation.mutate(rideId);
  };

  const handleDelete = (rideId: number) => {
    if (window.confirm("Are you sure you want to delete this ride?")) {
      setDeletingId(rideId);
      deleteMutation.mutate(rideId);
    }
  };

  const isJoined = (rideId: number) => joinedRides.has(rideId);
  const isCreator = (ride: Ride) => ride.driver.id === user?.id;

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
        <Typography variant="h4">Rides</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreate(true)}
        >
          Create Ride
        </Button>
      </Box>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="To Location"
              variant="outlined"
              value={inputTo}
              onChange={(e) => setInputTo(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOn color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="From Location"
              variant="outlined"
              value={inputFrom}
              onChange={(e) => setInputFrom(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOn color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              label="Max Price"
              type="number"
              variant="outlined"
              value={inputMaxPrice}
              onChange={handleSearchNumberChange}
              inputProps={{ min: 0 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoney color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              variant="outlined"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              onKeyDown={preventTyping}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTime color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClearSearch}
              sx={{ height: "56px" }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Rides List */}
      <Grid container spacing={3}>
        {rides.map((ride) => {
          const joined = isJoined(ride.id);
          const creator = isCreator(ride);
          const driverName = `${ride.driver.fname} ${ride.driver.lname}`;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ride.id}>
              <Card
                sx={{
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
                  {/* Driver Info */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Avatar
                      src={ride.driver.imgUrl}
                      {...stringAvatar(driverName)}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {driverName}
                      </Typography>
                    </Box>
                    {creator && (
                      <Chip
                        label="Your Ride"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Route */}
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <LocationOn color="primary" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        From
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ ml: 4 }}>
                      {ride.fromLoc}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 2,
                        mb: 1,
                      }}
                    >
                      <LocationOn color="error" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        To
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ ml: 4 }}>
                      {ride.toLoc}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Ride Details */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AccessTime color="action" fontSize="small" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Arrival Time
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {format(new Date(ride.arrivalTime), "MMM dd, HH:mm")}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AttachMoney color="action" fontSize="small" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Price
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ${ride.price}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <People color="action" fontSize="small" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Seats Available
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {ride.seatsAvailable}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <DirectionsCar color="action" fontSize="small" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Service
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {ride.service}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexDirection: "column",
                    }}
                  >
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Info />}
                      onClick={() => setDetailsRideId(ride.id)}
                      sx={{ mb: 1 }}
                    >
                      Show Details
                    </Button>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        justifyContent: "space-between",
                      }}
                    >
                      {!creator && (
                        <Button
                          fullWidth
                          variant={joined ? "outlined" : "contained"}
                          color={joined ? "error" : "primary"}
                          startIcon={joined ? <PersonRemove /> : <PersonAdd />}
                          onClick={() =>
                            joined ? handleLeave(ride.id) : handleJoin(ride.id)
                          }
                          disabled={
                            joinMutation.isPending ||
                            leaveMutation.isPending ||
                            ride.seatsAvailable === 0
                          }
                        >
                          {joined ? "Leave" : "Join"}
                        </Button>
                      )}
                      {creator && (
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDelete(ride.id)}
                          disabled={
                            deleteMutation.isPending || deletingId === ride.id
                          }
                        >
                          {deletingId === ride.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      )}
                    </Box>
                  </Box>
                  {ride.seatsAvailable === 0 && !joined && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      No seats available
                    </Alert>
                  )}
                </Box>
              </Card>
            </Grid>
          );
        })}

        {rides.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ mt: 2, textAlign: "center" }} color="text.secondary">
              No rides found. Try adjusting your filters or create a new ride.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Create Ride Dialog */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Ride</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="From Location"
              fullWidth
              value={createForm.fromLoc}
              onChange={(e) =>
                setCreateForm({ ...createForm, fromLoc: e.target.value })
              }
              required
            />
            <TextField
              label="To Location"
              fullWidth
              value={createForm.toLoc}
              onChange={(e) =>
                setCreateForm({ ...createForm, toLoc: e.target.value })
              }
              required
            />
            <TextField
              label="Price"
              type="number"
              fullWidth
              value={createForm.price}
              onChange={(e) => handleNumberChange(e, "price")}
              inputProps={{ min: 0 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              required
            />
            <TextField
              label="Seats Available"
              type="number"
              fullWidth
              value={createForm.seatsAvailable}
              onChange={(e) => handleNumberChange(e, "seatsAvailable")}
              inputProps={{ min: 0 }}
              required
            />
            <TextField
              label="Arrival Date"
              type="date"
              fullWidth
              value={createForm.arrivalDate}
              onChange={(e) =>
                setCreateForm({ ...createForm, arrivalDate: e.target.value })
              }
              onKeyDown={preventTyping}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
            <TextField
              label="Arrival Time"
              type="time"
              fullWidth
              value={createForm.arrivalTime}
              onChange={(e) =>
                setCreateForm({ ...createForm, arrivalTime: e.target.value })
              }
              // onKeyDown={preventTyping}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTime color="action" />
                  </InputAdornment>
                ),
              }}
              required
            />
            <TextField
              label="Service (e.g., Uber, Lyft, Personal)"
              fullWidth
              value={createForm.service}
              onChange={(e) =>
                setCreateForm({ ...createForm, service: e.target.value })
              }
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenCreate(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ride Details Dialog */}
      <Dialog
        open={detailsRideId !== null}
        onClose={() => setDetailsRideId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <People color="primary" />
            <Typography variant="h6">Ride Passengers</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {isLoadingDetails ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : rideDetails ? (
            <Box>
              {/* Ride Info Summary */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Ride Information
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {rideDetails.fromLoc} → {rideDetails.toLoc}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(rideDetails.arrivalTime), "MMM dd, yyyy 'at' HH:mm")}
                </Typography>
              </Paper>

              {/* Driver Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Creator
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                  }}
                >
                  <Avatar
                    src={rideDetails.driver.imgUrl}
                    {...stringAvatar(
                      `${rideDetails.driver.fname} ${rideDetails.driver.lname}`
                    )}
                    sx={{ width: 56, height: 56 }}
                  />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {rideDetails.driver.fname} {rideDetails.driver.lname}
                    </Typography>
                    <Chip
                      label="Creator"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              {/* Passengers List */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Passengers ({rideDetails.passengers?.length || 0})
                </Typography>
                {rideDetails.passengers && rideDetails.passengers.length > 0 ? (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {rideDetails.passengers.map((passenger) => {
                      const passengerName = `${passenger.fname} ${passenger.lname}`;
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={passenger.id}>
                          <Paper
                            sx={{
                              p: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              transition: "transform 0.2s, box-shadow 0.2s",
                              "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: 3,
                              },
                            }}
                          >
                            <Avatar
                              src={passenger.imgUrl}
                              {...stringAvatar(passengerName)}
                              sx={{ width: 48, height: 48 }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" fontWeight={600}>
                                {passengerName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Passenger
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No passengers have joined this ride yet.
                  </Alert>
                )}
              </Box>
            </Box>
          ) : (
            <Alert severity="error">Failed to load ride details</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsRideId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}