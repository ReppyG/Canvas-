import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';
import { db } from '../services/firebaseService';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';

const defaultSettings: Settings = { canvasUrl: '', apiToken: '', sampleDataMode: false };

export const useSettings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    const getSettingsDocRef = useCallback(() => {
        if (!user) return null;
        return doc(db, 'users', user.id, 'data', 'settings');
    }, [user]);

    useEffect(() => {
        const loadSettings = async () => {
            const docRef = getSettingsDocRef();
            if (!docRef) {
                setSettings(defaultSettings);
                setIsConfigured(false);
                return;
            }
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const storedSettings = docSnap.data() as Settings;
                setSettings(storedSettings);
                setIsConfigured(!!(storedSettings.canvasUrl && storedSettings.apiToken));
            } else {
                setSettings(defaultSettings);
                setIsConfigured(false);
            }
        };
        if (user) {
            loadSettings();
        } else {
            // Clear settings when user logs out
            setSettings(defaultSettings);
            setIsConfigured(false);
        }
    }, [user, getSettingsDocRef]);

    const saveSettings = useCallback(async (newSettings: Settings) => {
        const docRef = getSettingsDocRef();
        if (!docRef) return;
        await setDoc(docRef, newSettings);
        setSettings(newSettings);
        setIsConfigured(!!(newSettings.canvasUrl && newSettings.apiToken));
    }, [getSettingsDocRef]);

    const clearSettings = useCallback(async () => {
        const docRef = getSettingsDocRef();
        if (!docRef) return;
        await deleteDoc(docRef);
        setSettings(defaultSettings);
        setIsConfigured(false);
    }, [getSettingsDocRef]);

    const enableSampleDataMode = useCallback(async () => {
        const docRef = getSettingsDocRef();
        if (!docRef) return;
        const currentSettings = settings || defaultSettings;
        const newSettings = { ...currentSettings, sampleDataMode: true };
        await setDoc(docRef, newSettings);
        setSettings(newSettings);
    }, [getSettingsDocRef, settings]);

    return { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode };
};