"use client";
import { getUser } from "@/lib/client";
import React, { createContext, useContext, useState, useEffect } from "react";

type User = {
  full_name: string | null;
  role: "reader" | "staff" | null;
  staff_id?: number | null; // Thêm staff_id vào kiểu User
};

type AuthContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const userObj = await getUser();
        if (userObj) {
          setUser({
            full_name: userObj.user_metadata?.full_name || null,
            role: userObj.user_metadata?.role || null,
            staff_id: userObj.user_metadata?.staff_id || null,
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
