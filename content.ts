
const IFRAME_ID = 'canvas-ai-assistant-iframe';

function toggleIframe() {
    let iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement;
    if (iframe) {
        const isVisible = iframe.style.display !== 'none';
        iframe.style.display = isVisible ? 'none' : 'block';
    } else {
        iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = chrome.runtime.getURL('index.html');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '2147483647';
        iframe.style.display = 'block';
        document.body.appendChild(iframe);
    }
}

// Listen for messages from the background script (toolbar icon click)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TOGGLE_UI') {
        toggleIframe();
        sendResponse({ status: 'done' });
    }
    return true;
});

// Listen for messages from the iframe (close button inside the React app)
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
        // Basic check to ignore messages from other extensions or the page itself
        if (event.data.type && (event.data.type === 'CLOSE_CANVAS_AI_IFRAME')) {
           const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement;
            if (iframe && iframe.contentWindow === event.source) {
                iframe.style.display = 'none';
            }
        }
    }
}, false);