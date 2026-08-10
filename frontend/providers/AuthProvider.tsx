import { createContext, ReactNode, useContext, useState } from "react";

type AuthContextType = {
  isLogIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLogIn, setIsLogIn] = useState(false);

  function signIn() {
    setIsLogIn(true);
  }

  function signOut() {
    setIsLogIn(false);
  }

  return (
    <AuthContext.Provider
      value={{
        isLogIn,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("[ERROR!] useAuth must be used within AuthProvider.");
  }
  return context;
}
