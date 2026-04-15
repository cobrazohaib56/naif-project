import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import Quizzes from "./pages/Quizzes";
import QuizPlay from "./pages/QuizPlay";
import QuizResults from "./pages/QuizResults";
import AskAI from "./pages/AskAI";
import WritingCoach from "./pages/WritingCoach";
import Schedule from "./pages/Schedule";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { AdminRoute } from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminQuiz from "./pages/admin/AdminQuiz";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/notes/:id" element={<NoteDetail />} />
                    <Route path="/quizzes" element={<Quizzes />} />
                    <Route path="/quizzes/:id/play" element={<QuizPlay />} />
                    <Route path="/quizzes/:id/results" element={<QuizResults />} />
                    <Route path="/ask-ai" element={<AskAI />} />
                    <Route path="/writing-coach" element={<WritingCoach />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/documents" element={<AdminRoute><AdminDocuments /></AdminRoute>} />
                    <Route path="/admin/quiz" element={<AdminRoute><AdminQuiz /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
