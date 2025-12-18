import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  Grid,
  CircularProgress,
} from "@mui/material";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {  AxiosError } from "axios";
import Snowfall from 'react-snowfall'

const emailSchema = z.object({
  email: z
  .email("Invalid email format")
  .refine(
    (email) =>
      email.endsWith("@gmail.com") || email.endsWith("@webxio.pro"),
    {
      message: "Email must be a @gmail.com or @webxio.pro address",
    }
  ),
});

const detailsSchema = z.object({
  fname: z.string().min(1, "First name is required"),
  lname: z.string().min(1, "Last name is required"),
  userPassword: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  bio: z.string().optional(),
});

type DetailsFormData = z.infer<typeof detailsSchema>;

type Step = "email" | "code" | "details";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
  });

  const sendCode = async () => {
    setError("");
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid email");
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await client.post("/auth/email/send-code", {
        email: parsed.data.email,
      });
      setVerificationId(response.data.verificationId);
      setStep("code");
    } catch (err) {
      console.error(err);
      if (err instanceof AxiosError && err.response) {
        setError(err.response.data.error || "Failed to send verification code");
      } else {
        setError("Failed to send verification code");
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (!verificationId) {
      setError("Please request a verification code first");
      return;
    }
    if (!code.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setIsVerifyingCode(true);
    try {
      await client.post("/auth/email/verify-code", {
        email,
        verificationId,
        code,
      });
      setStep("details");
    } catch (err) {
      console.error(err);
      if (err instanceof AxiosError && err.response) {
        setError(err.response.data.error || "Failed to verify code");
      } else {
        setError("Failed to verify code");
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const onSubmit = async (data: DetailsFormData) => {
    setIsCreatingAccount(true);
    setError("");
    try {
      if (!verificationId) {
        setError("Email verification is required");
        return;
      }

      const response = await client.post("/auth/sign-up", {
        ...data,
        email,
        verificationId,
      });
      const { token, user } = response.data;
      login(token, user);
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err instanceof AxiosError && err.response) {
        setError(err.response.data.error);
      } else {
        setError("Failed to register");
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const resetToEmailStep = () => {
    setError("");
    setCode("");
    setVerificationId(null);
    setStep("email");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: 2,
      }}
    >
      <Snowfall />
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
            Create Account
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
            {step === "email"
              ? "Enter your email to receive a verification code"
              : step === "code"
                ? "Enter the verification code we sent to your email"
                : "Complete your account details"}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={step === "details" ? handleSubmit(onSubmit) : undefined}
            sx={{ width: "100%" }}
          >
            {step === "email" && (
              <>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isSendingCode}
                  sx={{ mt: 4, mb: 2, py: 1.5 }}
                  onClick={sendCode}
                >
                  {isSendingCode ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </>
            )}

            {step === "code" && (
              <>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      disabled
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Verification Code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isVerifyingCode}
                  sx={{ mt: 4, mb: 1, py: 1.5 }}
                  onClick={verifyCode}
                >
                  {isVerifyingCode ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Verify Code"
                  )}
                </Button>

                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      disabled={isSendingCode}
                      onClick={sendCode}
                    >
                      Resend Code
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Button
                      type="button"
                      fullWidth
                      variant="text"
                      onClick={resetToEmailStep}
                    >
                      Change Email
                    </Button>
                  </Grid>
                </Grid>
              </>
            )}

            {step === "details" && (
              <>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      disabled
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="First Name"
                      {...register("fname")}
                      error={!!errors.fname}
                      helperText={errors.fname?.message}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      {...register("lname")}
                      error={!!errors.lname}
                      helperText={errors.lname?.message}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
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
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Username"
                      {...register("username")}
                      error={!!errors.username}
                      helperText={errors.username?.message}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
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
                  disabled={isCreatingAccount}
                  sx={{ mt: 4, mb: 2, py: 1.5 }}
                >
                  {isCreatingAccount ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </>
            )}

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{
                    textDecoration: "none",
                    fontWeight: "bold",
                    color: "#4F46E5",
                  }}
                >
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
