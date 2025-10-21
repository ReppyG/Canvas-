const handleTestConnection = async () => {
    setTestStatus('testing');
    console.log('Testing with URL:', getFormattedUrl());
    console.log('Testing with token:', apiToken.substring(0, 10) + '...');
    
    try {
        await testConnection(getFormattedUrl(), apiToken.trim());
        setTestStatus('success');
        setTestMessage('Successfully connected to the Canvas API!');
    } catch (err) {
        console.error('Connection test failed:', err);
        setTestStatus('error');
        // ... rest of error handling
    }
};
