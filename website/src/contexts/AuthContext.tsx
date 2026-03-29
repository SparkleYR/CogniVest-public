import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  login as apiLogin,
  getMe,
  logout as apiLogout,
  isLoggedIn,
  getStoredRole,
  getStoredName,
  type UserProfile,
  type LoginResponse,
  type SignupResponse,
  signupClient,
  signupAdvisor,
} from "../utils/cognivest-api";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "client" | "advisor";
  profileId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<LoginResponse>;
  signUpClient: (data: Parameters<typeof signupClient>[0]) => Promise<SignupResponse>;
  signUpAdvisor: (data: Parameters<typeof signupAdvisor>[0]) => Promise<SignupResponse>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have a stored session
  useEffect(() => {
    const init = async () => {
      if (isLoggedIn()) {
        try {
          const profile = await getMe();
          if (profile) {
            setUser({
              uid: profile.user_id,
              email: profile.email,
              displayName: profile.client?.client_name || profile.advisor?.name || null,
              role: profile.role as "client" | "advisor",
              profileId: profile.client?.client_id || profile.advisor?.advisor_id,
            });
          }
        } catch {
          apiLogout();
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      setUser({
        uid: res.user_id,
        email,
        displayName: res.name,
        role: res.role as "client" | "advisor",
        profileId: res.profile_id,
      });
      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUpClient = useCallback(async (data: Parameters<typeof signupClient>[0]) => {
    setIsLoading(true);
    try {
      const res = await signupClient(data);
      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUpAdvisor = useCallback(async (data: Parameters<typeof signupAdvisor>[0]) => {
    setIsLoading(true);
    try {
      const res = await signupAdvisor(data);
      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signUpClient,
      signUpAdvisor,
      signOut,
      isAuthenticated: !!user,
    }),
    [user, isLoading, signIn, signUpClient, signUpAdvisor, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
