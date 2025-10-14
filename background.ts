
import { getAssignments as fetchAssignments, getCourses } from './services/canvasApiService';
import { Settings } from './types';

const SETTINGS_KEY = 'canvasAiAssistantSettings';
const CANVAS_ASSIGNMENT_IDS_KEY = 'canvasAiAssistantAssignmentIds';
const ALARM_NAME = 'assignment-check';

async function getStoredData<T>(key: string): Promise<T | null> {
    const data = await chrome.storage.local.get(key);
    return data[key] || null;
}

async function setStoredData(key: string, value: any): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
}

// Register notification click handler once
chrome.notifications.onClicked.addListener(async (notificationId) => {
    const settings = await getStoredData<Settings>(SETTINGS_KEY);
    if (settings && settings.canvasUrl) {
        chrome.tabs.create({ url: `${settings.canvasUrl}/dashboard` });
        chrome.notifications.clear(notificationId);
    }
});

async function checkAssignments() {
    console.log('Checking for new assignments...');
    const settings = await getStoredData<Settings>(SETTINGS_KEY);

    if (!settings || !settings.canvasUrl || !settings.apiToken || settings.sampleDataMode) {
        console.log('Canvas credentials not configured or in sample mode. Skipping check.');
        return;
    }

    try {
        const assignments = await fetchAssignments(settings);
        const storedIdsRaw = await getStoredData<number[]>(CANVAS_ASSIGNMENT_IDS_KEY);
        const storedIds = new Set(storedIdsRaw || []);

        // Don't notify on first run with assignments, just store them.
        if (!storedIdsRaw) {
             console.log('First run, storing initial assignments.');
             const allAssignmentIds = assignments.map(a => a.id);
             await setStoredData(CANVAS_ASSIGNMENT_IDS_KEY, allAssignmentIds);
             return;
        }

        const newAssignments = assignments.filter(a => !storedIds.has(a.id));

        if (newAssignments.length > 0) {
            console.log(`Found ${newAssignments.length} new assignments.`);
            const courses = await getCourses(settings);
            const coursesById = new Map(courses.map(c => [c.id, c]));

            const message = newAssignments.length === 1
                ? `New assignment: ${newAssignments[0].title}`
                : `${newAssignments.length} new assignments posted.`;
            
            const items = newAssignments.slice(0, 5).map(a => {
                const course = coursesById.get(a.courseId);
                return { title: a.title, message: course ? course.courseCode : 'Unknown Course' };
            });

            chrome.notifications.create({
                type: newAssignments.length > 1 ? 'list' : 'basic',
                iconUrl: 'logo.png',
                title: 'New Canvas Assignments!',
                message: message,
                items: newAssignments.length > 1 ? items : undefined,
                priority: 2,
            });

            const allAssignmentIds = assignments.map(a => a.id);
            await setStoredData(CANVAS_ASSIGNMENT_IDS_KEY, allAssignmentIds);
        } else {
            console.log('No new assignments found.');
        }

    } catch (error) {
        console.error('Error checking assignments:', error);
    }
}

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Canvas AI Assistant installed or updated.');
    chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 1,
        periodInMinutes: 15,
    });
    if (details.reason === 'install') {
       checkAssignments();
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        checkAssignments();
    }
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started, checking assignments...');
    checkAssignments();
});

// New: Add listener for the extension icon click to toggle the UI
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' });
  }
});