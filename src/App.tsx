import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import FacultyHome from "./pages/faculty/FacultyHome.tsx";
import FacultyGenerate from "./pages/faculty/FacultyGenerate.tsx";
import FacultyQuizzes from "./pages/faculty/FacultyQuizzes.tsx";
import FacultyQuizEdit from "./pages/faculty/FacultyQuizEdit.tsx";
import FacultyResults from "./pages/faculty/FacultyResults.tsx";
import StudentHome from "./pages/student/StudentHome.tsx";
import StudentQuizzes from "./pages/student/StudentQuizzes.tsx";
import StudentAttempt from "./pages/student/StudentAttempt.tsx";
import StudentResults from "./pages/student/StudentResults.tsx";
import StudentLeaderboard from "./pages/student/StudentLeaderboard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Faculty */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute roles={["faculty"]}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FacultyHome />} />
                <Route path="generate" element={<FacultyGenerate />} />
                <Route path="quizzes" element={<FacultyQuizzes />} />
                <Route path="quizzes/:id" element={<FacultyQuizEdit />} />
                <Route path="results" element={<FacultyResults />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Student */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute roles={["student"]}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudentHome />} />
                <Route path="quizzes" element={<StudentQuizzes />} />
                <Route path="quizzes/:id" element={<StudentAttempt />} />
                <Route path="results" element={<StudentResults />} />
                <Route path="leaderboard" element={<StudentLeaderboard />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
