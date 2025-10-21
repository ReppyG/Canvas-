import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';
import { storage } from '../services/storageService';

const SETTINGS_KEY = 'canvasAiAssistantSettings';
const defaultSettings: Settings = { canvasUrl: '', apiToken: '', sampleDataMode: false };

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const storedSettings = await storage.get<Settings>(SETTINGS_KEY);
            if (storedSettings) {
                setSettings(storedSettings);
                setIsConfigured(!!(storedSettings.canvasUrl && storedSettings.apiToken));
            } else {
                setSettings(defaultSettings);
                setIsConfigured(false);
            }
        };
        loadSettings();
    }, []);

    const saveSettings = useCallback(async (newSettings: Settings) => {
        await storage.set(SETTINGS_KEY, newSettings);
        setSettings(newSettings);
        setIsConfigured(!!(newSettings.canvasUrl && newSettings.apiToken));
    }, []);

    const clearSettings = useCallback(async () => {
        await storage.remove(SETTINGS_KEY);
        setSettings(defaultSettings);
        setIsConfigured(false);
    }, []);

    const enableSampleDataMode = useCallback(async () => {
        const currentSettings = (await storage.get<Settings>(SETTINGS_KEY)) || defaultSettings;
        const newSettings = { ...currentSettings, sampleDataMode: true };
        await storage.set(SETTINGS_KEY, newSettings);
        setSettings(newSettings);
    }, []);


    return { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode };
};