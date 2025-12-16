import { useState, useRef } from "react";
import QRCode from "qrcode";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
} from "@mui/material";

export default function ShowQRButton({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateQR = () => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, value, {
      width: 260,
      margin: 1,
    }).catch(console.error);
  };

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Show QR
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          transition: {
            onEntered: generateQR,
          },
        }}
      >
        <DialogTitle textAlign="center">Your QR Code</DialogTitle>

        <DialogContent>
          <Box display="flex" justifyContent="center" py={2}>
            <canvas ref={canvasRef} />
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
