import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Legacy OAuth callback route. Local password auth resolves inside the
 * /login page, so this just redirects home.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);
  return null;
}
