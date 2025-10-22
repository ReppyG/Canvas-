import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../services/firebaseService';
// Fix: Use Firebase v8 compat imports and types.
// Fix for line 7: Changed import from 'firebase/app' to 'firebase/compat/app' for v8 compatibility.
import firebase from 'firebase/compat/app';

// Fix: Change type import to Firebase v8 compat style.
type FirebaseUser = firebase.User;

interface User {
    id: string;
    email: string | null;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fix: Use Firebase v8 compat `onAuthStateChanged` method.
        const unsubscribe = auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
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
        // Fix: Use Firebase v8 compat `signInWithEmailAndPassword` method.
        await auth.signInWithEmailAndPassword(email, password);
    }, []);

    const signup = useCallback(async (email: string, password: string): Promise<void> => {
        // Fix: Use Firebase v8 compat `createUserWithEmailAndPassword` method.
        await auth.createUserWithEmailAndPassword(email, password);
    }, []);

    const logout = useCallback(async () => {
        // Fix: Use Firebase v8 compat `signOut` method.
        await auth.signOut();
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