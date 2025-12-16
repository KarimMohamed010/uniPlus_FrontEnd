import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import TeamsList from "./pages/Teams/TeamsList";
import EventsList from "./pages/Events/EventsList";
import ChatPage from "./pages/Chat/ChatPage";
import Profile from "./pages/Profile/Profile";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import TeamDetails from "./pages/Teams/TeamDetails";

function App() {
  return (
    <NotificationProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/teams" element={<TeamsList />} />
            <Route path="/teams/:id" element={<TeamDetails />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotificationProvider>
  );
}

export default App;
