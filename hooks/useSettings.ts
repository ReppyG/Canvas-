// Fix: Add a triple-slash directive to include TypeScript type definitions for the Chrome Extension APIs.
/// <reference types="chrome" />

import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';

const SETTINGS_KEY = 'canvasAiAssistantSettings';
const defaultSettings: Settings = { canvasUrl: '', apiToken: '', sampleDataMode: false };

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (typeof chrome !== "undefined" && chrome.storage) {
                    const data = await chrome.storage.local.get(SETTINGS_KEY);
                    if (data[SETTINGS_KEY]) {
                        const parsed = data[SETTINGS_KEY];
                        setSettings(parsed);
                        setIsConfigured(!!(parsed.canvasUrl && parsed.apiToken));
                    } else {
                        setSettings(defaultSettings);
                        setIsConfigured(false);
                    }
                } else {
                     setSettings(defaultSettings);
                }
            } catch (error) {
                console.error("Failed to load settings from chrome.storage.local", error);
                setSettings(defaultSettings);
            }
        };
        loadSettings();
    }, []);

    const saveSettings = useCallback(async (newSettings: Settings) => {
        try {
            await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
            setSettings(newSettings);
            setIsConfigured(!!(newSettings.canvasUrl && newSettings.apiToken));
        } catch (error) {
            console.error("Failed to save settings to chrome.storage.local", error);
        }
    }, []);

    const clearSettings = useCallback(async () => {
        try {
            await chrome.storage.local.remove(SETTINGS_KEY);
            setSettings(defaultSettings);
            setIsConfigured(false);
        } catch (error) {
            console.error("Failed to clear settings from chrome.storage.local", error);
        }
    }, []);

    const enableSampleDataMode = useCallback(() => {
        setSettings(prevSettings => {
            const currentSettings = prevSettings || defaultSettings;
            const newSettings = { ...currentSettings, sampleDataMode: true };
            if (typeof chrome !== "undefined" && chrome.storage) {
                chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
            }
            return newSettings;
        });
    }, []);


    return { settings, saveSettings, clearSettings, isConfigured, enableSampleDataMode };
};