import { useEffect, useState } from "react";
import { fetch } from "@tauri-apps/api/http";

import LoginPage from "./components/LoginPage";
import { AuthenticatedApp } from "./components/AuthenticatedApp";

// Type definitions for login response
interface LoginResponse {
  message: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
  token?: string;
  accessToken?: string;
  access_token?: string;
  authToken?: string;
}

interface LoginErrorResponse {
  error?: string;
  message?: string;
}

// JWT Token utilities
interface JWTPayload {
  exp?: number; // Expiration time (Unix timestamp)
  iat?: number; // Issued at time
  sub?: string; // Subject (user ID)
  [key: string]: any;
}

// Function to decode JWT token without verification (client-side only for expiration check)
const decodeJWT = (token: string): JWTPayload | null => {
  try {
    // JWT has 3 parts separated by dots: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Invalid JWT format");
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Add padding if needed for base64 decoding
    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);

    // Decode base64
    const decodedPayload = atob(paddedPayload);

    // Parse JSON
    return JSON.parse(decodedPayload) as JWTPayload;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Consider expired if we can't decode or no expiration
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return payload.exp < now;
};

// Function to get token expiration time in milliseconds
const getTokenExpiration = (token: string): number | null => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  return payload.exp * 1000; // Convert to milliseconds
};

function App() {
  const [isLogin, setIsLogin] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  // Check for valid token on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedExpiry = localStorage.getItem("tokenExpiry");

    console.log("Checking saved token on app load:", {
      savedToken: !!savedToken,
      savedExpiry,
    });

    if (savedToken) {
      // First check if token is expired using JWT's built-in expiration
      if (isTokenExpired(savedToken)) {
        console.log("Saved token is expired (JWT check), clearing...");
        localStorage.removeItem("authToken");
        localStorage.removeItem("tokenExpiry");
        localStorage.removeItem("userInfo");
        return;
      }

      // Get actual expiration time from JWT
      const jwtExpiration = getTokenExpiration(savedToken);

      if (jwtExpiration) {
        console.log("Token validation:", {
          now: Date.now(),
          jwtExpiration,
          timeRemaining: jwtExpiration - Date.now(),
        });

        // Use JWT expiration time
        setAuthToken(savedToken);
        setTokenExpiry(jwtExpiration);
        setIsLogin(true);

        // Update localStorage with correct expiration time
        localStorage.setItem("tokenExpiry", jwtExpiration.toString());

        console.log("Token is valid, auto-login successful");
      } else if (savedExpiry) {
        // Fallback to saved expiry if JWT doesn't have expiration
        const expiryTime = parseInt(savedExpiry);
        const now = Date.now();

        if (now < expiryTime) {
          setAuthToken(savedToken);
          setTokenExpiry(expiryTime);
          setIsLogin(true);
          console.log("Token is valid (fallback check), auto-login successful");
        } else {
          console.log("Saved token expired (fallback check), clearing...");
          localStorage.removeItem("authToken");
          localStorage.removeItem("tokenExpiry");
          localStorage.removeItem("userInfo");
        }
      }
    }
  }, []);

  // Auto-logout when token expires
  useEffect(() => {
    if (tokenExpiry) {
      const now = Date.now();
      const timeUntilExpiry = tokenExpiry - now;

      if (timeUntilExpiry > 0) {
        const timer = setTimeout(() => {
          handleLogout();
        }, timeUntilExpiry);

        return () => clearTimeout(timer);
      }
    }
  }, [tokenExpiry]);

  // Periodic token validation and countdown update
  useEffect(() => {
    if (authToken && isLogin) {
      const interval = setInterval(() => {
        // Check JWT expiration first
        if (isTokenExpired(authToken)) {
          console.log("Token expired (JWT check), logging out...");
          handleLogout();
          return;
        }

        // Update countdown using JWT expiration or fallback
        const jwtExpiration = getTokenExpiration(authToken);
        const expirationTime = jwtExpiration || tokenExpiry;

        if (expirationTime) {
          const now = Date.now();
          const remaining = expirationTime - now;

          if (remaining <= 0) {
            console.log("Token expired (time check), logging out...");
            handleLogout();
          } else {
            // setTimeUntilExpiry(remaining);
          }
        }
      }, 1000); // Check every second for accurate countdown

      return () => clearInterval(interval);
    } else {
      //  setTimeUntilExpiry(null);
    }
  }, [authToken, isLogin, tokenExpiry]);
  const handleLogout = () => {
    setAuthToken(null);
    setTokenExpiry(null);
    // setTimeUntilExpiry(null);
    setIsLogin(false);
    localStorage.removeItem("authToken");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("userInfo");
  };

  // Helper function to format time remaining

  const onLogin = async ({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) => {
    try {
      const response = await fetch(
        "https://apisplice.vipremixer.com/api/v1/login",
        {
          method: "POST",
          body: {
            type: "Json",
            payload: { username, password },
          },
        }
      );

      console.log("Login response:", response);

      if (response.ok && response.data) {
        const data = response.data as LoginResponse;
        // console.log("Login data:", data);

        // Extract token from headers (common places for JWT tokens)
        let token = null;

        // Check for token in response headers
        if (response.headers) {
          token =
            response.headers["authorization"] ||
            response.headers["x-auth-token"] ||
            response.headers["x-access-token"] ||
            response.headers["set-cookie"];
        }

        // If no token in headers, check response body
        if (!token && data) {
          token =
            data.token ||
            data.accessToken ||
            data.access_token ||
            data.authToken;
        }

        if (token) {
          // Get expiration time from JWT token itself
          const jwtExpiration = getTokenExpiration(token);
          let expiryTime: number;

          if (jwtExpiration) {
            // Use JWT's built-in expiration
            expiryTime = jwtExpiration;
            // console.log("Using JWT expiration time:", new Date(jwtExpiration));
          } else {
            // Fallback: set expiration time (10 seconds for testing, 12 hours for production)
            expiryTime = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
            // For production use: expiryTime = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
            // console.log("JWT has no expiration, using fallback time");
          }

          // Store token and user info
          setAuthToken(token);
          setTokenExpiry(expiryTime);
          setIsLogin(true);

          // Persist to localStorage
          localStorage.setItem("authToken", token);
          localStorage.setItem("tokenExpiry", expiryTime.toString());
          localStorage.setItem("userInfo", JSON.stringify(data.user || data));

          // console.log("Login successful, token stored:", {
          //   token: token.substring(0, 20) + "...", // Only log first 20 chars for security
          //   expirationTime: new Date(expiryTime),
          //   isJWTExpiration: !!jwtExpiration,
          // });
        } else {
          // console.warn("Login successful but no token found in response");
          //setIsLogin(true); // Still allow login even without token
        }
      } else {
        // console.error("Login failed:", response.status, response.data);
        // Safely handle the error message
        const errorData = response.data as LoginErrorResponse;
        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          `Login failed with status ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Re-throw to handle in LoginPage component
    }
  };
  return (
    <>
      {isLogin ? (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center  relative">
          <AuthenticatedApp />
        </div>
      ) : (
        <LoginPage onLogin={onLogin} />
      )}
    </>
  );
}

export default App;
