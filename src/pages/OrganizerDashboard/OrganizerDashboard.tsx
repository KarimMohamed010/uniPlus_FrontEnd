import React, { useState, useRef, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Videocam } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext.tsx";
import client from "../../api/client.ts";
import jsQR from "jsqr";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const [tabValue, setTabValue] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [scanHistory, setScanHistory] = useState<
    { timestamp: string; success: boolean; result?: string }[]
  >([]);

  const hasTeamRole =
    user?.roles.global === "student" && user?.roles.team?.length > 0;

  if (!hasTeamRole) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Alert severity="warning">
          This page is only accessible to students with team roles.
        </Alert>
      </Box>
    );
  }

  /* -------------------- Camera lifecycle -------------------- */

  const stopCamera = () => {
    scanningRef.current = false;
    setIsScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      videoRef.current.onloadedmetadata = () => {
        scanningRef.current = true;
        setIsScanning(true);
        requestAnimationFrame(scanLoop);
      };
    } catch {
      setError("Failed to access camera.");
    }
  };

  /* -------------------- Scan loop -------------------- */

  const scanLoop = () => {
    if (!scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      scanningRef.current = false;
      stopCamera();
      handleQRScanned(code.data);
      return;
    }

    requestAnimationFrame(scanLoop);
  };

  /* -------------------- QR handling -------------------- */

  const handleQRScanned = async (qrData: string) => {
    try {
      setLoading(true);
      setError("");

      const parsed = JSON.parse(qrData);
      const response = await client.patch("/tickets/verifyQr", parsed);

      setResult(response.data);
      setResultOpen(true);

      setScanHistory((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          success: true,
          result: response.data.message,
        },
        ...prev,
      ]);
    } catch (error) {
      const msg = error.response.data.error ;
      setError(msg );
      setResultOpen(true);

      setScanHistory((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          success: false,
          result: msg,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Dialog sync -------------------- */

  useEffect(() => {
    if (!scannerOpen) stopCamera();
  }, [scannerOpen]);

  /* -------------------- UI -------------------- */

  return (
    <Box>
      <Typography variant="h4">Organizer Dashboard</Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="QR Scanner" />
          <Tab label="Your Teams" />
          <Tab label="Scan History" />
        </Tabs>
        <TabPanel value={tabValue} index={0}>
          <Button
            variant="contained"
            startIcon={<Videocam />}
            onClick={() => setScannerOpen(true)}
          >
            Open Scanner
          </Button>
        </TabPanel>
        {/* Your Teams Tab */}{" "}
        <TabPanel value={tabValue} index={1}>
          {" "}
          <Grid container spacing={2}>
            {" "}
            {user?.roles.team && user.roles.team.length > 0 ? (
              user.roles.team.map((team) => (
                <Grid key={team.teamId} size={{ xs: 12, md: 6 }}>
                  {" "}
                  <Paper sx={{ p: 3 }}>
                    {" "}
                    <Typography variant="h6">
                      Team {team.teamId}
                    </Typography>{" "}
                    <Typography variant="body2" color="textSecondary">
                      {" "}
                      <strong>Role:</strong> {team.role}{" "}
                    </Typography>{" "}
                  </Paper>{" "}
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                {" "}
                <Alert severity="info">
                  {" "}
                  You are not part of any teams yet.{" "}
                </Alert>{" "}
              </Grid>
            )}{" "}
          </Grid>{" "}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {scanHistory.length === 0 ? (
            <Alert severity="info">No scans yet</Alert>
          ) : (
            <Table>
              <TableBody>
                {scanHistory.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.timestamp}</TableCell>
                    <TableCell>{s.success ? "Success" : "Failed"}</TableCell>
                    <TableCell>{s.result}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>
      </Paper>

      {/* Scanner Dialog */}
      <Dialog open={scannerOpen} onClose={() => setScannerOpen(false)} fullWidth >
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ position: "relative", paddingBottom: "100%" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {loading && <CircularProgress />}
          </Box>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setScannerOpen(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={isScanning}
            onClick={startCamera}
          >
            {isScanning ? "Scanning…" : "Start Camera"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onClose={() => setResultOpen(false)}>
        <DialogTitle>{error ? "Error" : "Success"}</DialogTitle>
        <DialogContent>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Alert severity="success">{result?.message}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
