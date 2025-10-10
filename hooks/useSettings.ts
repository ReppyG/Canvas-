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
            }
        } catch (error) {
            console.error("Failed to parse settings from localStorage", error);
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
            setSettings(null);
            setIsConfigured(false);
        } catch (error) {
            console.error("Failed to clear settings from localStorage", error);
        }
    }, []);

    const enableSampleDataMode = useCallback(() => {
        setSettings(prevSettings => {
            if (prevSettings) {
                const newSettings = { ...prevSettings, sampleDataMode: true };
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
                return newSettings;
            }
            return prevSettings;
        });
    }, []);


    return { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode };
};
