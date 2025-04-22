// filepath: d:\osamuProjects\virtual-cinema\apps\web\components\auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase.client";
import { User as DocUser } from "@/types/users";
import { subscribeToUserDoc } from "@/services/users";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  authStateReady: boolean;
};

const AuthContext = createContext<AuthContextType & { doc: DocUser | null }>({
  user: null,
  isLoading: true,
  authStateReady: false,
  doc: null,
});

const logout = async () => {
  await fetch("/api/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [doc, setDoc] = useState<DocUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStateReady, setAuthStateReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setAuthStateReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {

    if (!authStateReady) return;
    if (user) {
      const unsubscribe = subscribeToUserDoc(user.uid, (userData) => {
        setDoc(userData);
      });
      setIsLoading(false);

      return () => unsubscribe();
    } else {
      // Fetch the api logout
      logout();
      setDoc(null);
      setIsLoading(false);
    }
  }, [user, authStateReady]);

  return (
    <AuthContext.Provider value={{ user, isLoading, authStateReady, doc }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
