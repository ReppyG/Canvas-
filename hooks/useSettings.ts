import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';
import { db } from '../services/firebaseService';
import { useAuth } from './useAuth';

const defaultSettings: Settings = { canvasUrl: '', apiToken: '', sampleDataMode: false };

export const useSettings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    const getSettingsDocRef = useCallback(() => {
        if (!user) return null;
        return db.collection('users').doc(user.id).collection('data').doc('settings');
    }, [user]);

    useEffect(() => {
        const loadSettings = async () => {
            const docRef = getSettingsDocRef();
            if (!docRef) {
                setSettings(defaultSettings);
                setIsConfigured(false);
                return;
            }
            const docSnap = await docRef.get();
            if (docSnap.exists) {
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
        await docRef.set(newSettings);
        setSettings(newSettings);
        setIsConfigured(!!(newSettings.canvasUrl && newSettings.apiToken));
    }, [getSettingsDocRef]);

    const clearSettings = useCallback(async () => {
        const docRef = getSettingsDocRef();
        if (!docRef) return;
        await docRef.delete();
        setSettings(defaultSettings);
        setIsConfigured(false);
    }, [getSettingsDocRef]);

    const enableSampleDataMode = useCallback(async () => {
        const docRef = getSettingsDocRef();
        if (!docRef) return;
        const currentSettings = settings || defaultSettings;
        const newSettings = { ...currentSettings, sampleDataMode: true };
        await docRef.set(newSettings);
        setSettings(newSettings);
    }, [getSettingsDocRef, settings]);

    return { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode };
};
