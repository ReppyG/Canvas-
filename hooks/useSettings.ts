import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';

const SETTINGS_KEY = 'canvasAiAssistantSettings';

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_KEY);
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                setSettings(parsed);
                setIsConfigured(!!(parsed.canvasUrl && parsed.apiToken));
            } else {
                // If no settings exist, initialize with a default structure
                setSettings({ canvasUrl: '', apiToken: '', sampleDataMode: false });
                setIsConfigured(false);
            }
        } catch (error) {
            console.error("Failed to parse settings from localStorage", error);
            // On error, also initialize with a default structure
            setSettings({ canvasUrl: '', apiToken: '', sampleDataMode: false });
        }
    }, []);

    const saveSettings = useCallback((newSettings: Settings) => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            setSettings(newSettings);
            setIsConfigured(!!(newSettings.canvasUrl && newSettings.apiToken));
        } catch (error) {
            console.error("Failed to save settings to localStorage", error);
        }
    }, []);

    const clearSettings = useCallback(() => {
        try {
            localStorage.removeItem(SETTINGS_KEY);
            const clearedSettings = { canvasUrl: '', apiToken: '', sampleDataMode: false };
            setSettings(clearedSettings);
            setIsConfigured(false);
        } catch (error) {
            console.error("Failed to clear settings from localStorage", error);
        }
    }, []);

    const enableSampleDataMode = useCallback(() => {
        setSettings(prevSettings => {
            const currentSettings = prevSettings || { canvasUrl: '', apiToken: '', sampleDataMode: false };
            const newSettings = { ...currentSettings, sampleDataMode: true };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);


    return { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode };
};
