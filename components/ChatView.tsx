import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { UserChatMessage, ConversationSummary } from '../types';
import { storage } from '../services/storageService';
import { UsersIcon, SendIcon, PlusIcon } from './icons/Icons';
import { format } from 'date-fns';

const CHAT_ID_KEY = 'studentPlatformChatId';
const CHAT_CONVERSATIONS_KEY = 'studentPlatformConversations';

const ChatView: React.FC = () => {
    const [myId, setMyId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Record<string, UserChatMessage[]>>({});
    const [activePeerId, setActivePeerId] = useState<string | null>(null);
    const [peerIdInput, setPeerIdInput] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const initializeChat = async () => {
            let userId = await storage.get<string>(CHAT_ID_KEY);
            if (!userId) {
                userId = Math.floor(100000 + Math.random() * 900000).toString();
                await storage.set(CHAT_ID_KEY, userId);
            }
            setMyId(userId);

            const storedConversations = await storage.get<Record<string, UserChatMessage[]>>(CHAT_CONVERSATIONS_KEY);
            if (storedConversations) {
                setConversations(storedConversations);
            }
        };
        initializeChat();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversations, activePeerId]);

    const saveConversations = useCallback(async (updatedConversations: Record<string, UserChatMessage[]>) => {
        await storage.set(CHAT_CONVERSATIONS_KEY, updatedConversations);
    }, []);

    const conversationSummaries = useMemo<ConversationSummary[]>(() => {
        return Object.keys(conversations)
            .map(peerId => {
                const messages = conversations[peerId];
                if (messages.length === 0) return null;
                const lastMessage = messages[messages.length - 1];
                return {
                    peerId,
                    lastMessage: lastMessage.text,
                    timestamp: lastMessage.timestamp,
                };
            })
            .filter((summary): summary is ConversationSummary => summary !== null)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [conversations]);

    const handleStartChat = () => {
        const peerId = peerIdInput.trim();
        if (peerId && peerId !== myId && !conversations[peerId]) {
            const updatedConversations = { ...conversations, [peerId]: [] };
            setConversations(updatedConversations);
            saveConversations(updatedConversations);
            setActivePeerId(peerId);
        }
        setPeerIdInput('');
    };

    const handleSendMessage = () => {
        if (!messageInput.trim() || !activePeerId || !myId) return;

        const conversationId = [myId, activePeerId].sort().join('-');
        const newMessage: UserChatMessage = {
            id: Date.now().toString(),
            conversationId,
            senderId: myId,
            text: messageInput.trim(),
            timestamp: new Date().toISOString(),
        };
        
        const updatedPeerConvo = [...(conversations[activePeerId] || []), newMessage];
        const updatedConversations = { ...conversations, [activePeerId]: updatedPeerConvo };
        
        setConversations(updatedConversations);
        saveConversations(updatedConversations);
        setMessageInput('');
    };

    const activeMessages = useMemo(() => {
        if (!activePeerId) return [];
        return conversations[activePeerId] || [];
    }, [activePeerId, conversations]);

    return (
        <div className="flex h-full animate-fade-in bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Conversations List */}
            <div className="w-1/3 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chats</h2>
                    <div className="text-sm p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-center">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Your Chat ID: </span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">{myId || '...'}</span>
                    </div>
                </div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={peerIdInput}
                            onChange={(e) => setPeerIdInput(e.target.value)}
                            placeholder="Enter a Chat ID"
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm"
                        />
                        <button onClick={handleStartChat} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversationSummaries.map(convo => (
                        <button key={convo.peerId} onClick={() => setActivePeerId(convo.peerId)} className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activePeerId === convo.peerId ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}>
                            <h3 className="font-semibold text-gray-900 dark:text-white">User {convo.peerId}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{convo.lastMessage}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {activePeerId ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Chat with User {activePeerId}</h3>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {activeMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderId === myId ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md p-3 rounded-lg ${msg.senderId === myId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.timestamp), 'p')}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                             <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent p-2 focus:outline-none"
                                />
                                <button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500"><SendIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                        <UsersIcon className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-semibold">Select a chat</h3>
                        <p className="max-w-sm">Choose a conversation from the list, or start a new one by entering a user's Chat ID.</p>
                        <div className="mt-4 text-xs p-2 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-800 dark:text-yellow-300">
                            <strong>Note:</strong> This is a local chat simulation. Messages are only stored in your browser and are not sent to other users.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatView;
