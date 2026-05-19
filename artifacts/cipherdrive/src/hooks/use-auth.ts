import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

export function useAuth() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("cipherdrive_token");
  
  const query = useGetCurrentUser({
    query: {
      enabled: !!token,
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
    }
  });

  useEffect(() => {
    if (!token || query.isError) {
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        setLocation("/login");
      }
    }
  }, [token, query.isError, setLocation]);

  return {
    user: query.data,
    isLoading: query.isLoading && !!token,
    isAuthenticated: !!query.data,
  };
}
