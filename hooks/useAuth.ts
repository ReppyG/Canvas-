import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../services/firebaseService';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    User as FirebaseUser 
} from 'firebase/auth';

interface AppUser {
    id: string;
    email: string | null;
}

interface AuthContextType {
    user: AppUser | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                setUser({ id: firebaseUser.uid, email: firebaseUser.email });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<void> => {
        await signInWithEmailAndPassword(auth, email, password);
    }, []);

    const signup = useCallback(async (email: string, password: string): Promise<void> => {
        await createUserWithEmailAndPassword(auth, email, password);
    }, []);

    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    const value = useMemo(() => ({ user, login, signup, logout, isLoading }), [user, login, signup, logout, isLoading]);

    return React.createElement(AuthContext.Provider, { value: value }, children);
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
