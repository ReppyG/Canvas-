export const createGlobalAssistantChat = async (context: string): Promise<any> => {
    const client = await getClient();
    return client.models.startChat({
        model: 'gemini-2.5-flash',
        history: [],
        systemInstruction: `You are a helpful AI assistant. Student data: ${context}`
    });
};