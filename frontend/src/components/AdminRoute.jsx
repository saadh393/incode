import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or a spinner
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default AdminRoute;
