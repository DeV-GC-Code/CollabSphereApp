import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import { ThemeProvider } from "./auth/ThemeContext.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { AuthPage } from "./pages/AuthPage.jsx";
import { FeedPage } from "./pages/FeedPage.jsx";
import { MessagesPage } from "./pages/MessagesPage.jsx";
import { NetworkPage } from "./pages/NetworkPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { SavedPage } from "./pages/SavedPage.jsx";
import { SpheresPage } from "./pages/SpheresPage.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/feed" replace /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={<GuestRoute><AuthPage /></GuestRoute>}
          />
          <Route
            path="/"
            element={<ProtectedRoute><AppShell /></ProtectedRoute>}
          >
            <Route index element={<Navigate to="/feed" replace />} />
            <Route path="feed"          element={<FeedPage />} />
            <Route path="network"       element={<NetworkPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="spheres"       element={<SpheresPage />} />
            <Route path="saved"         element={<SavedPage />} />
            <Route path="messages"      element={<MessagesPage />} />
            <Route path="profile"       element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
