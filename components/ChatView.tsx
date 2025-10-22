import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserChatMessage, ConversationSummary } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebaseService';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { UsersIcon, SendIcon, PlusIcon, ClipboardCopyIcon, CheckIcon } from './icons/Icons';
import { format, formatRelative, parseISO } from 'date-fns';

const ChatView: React.FC = () => {
    const { user } = useAuth();
    const myId = user?.id;
    
    const [allConversations, setAllConversations] = useState<UserChatMessage[]>([]);
    const [activePeerId, setActivePeerId] = useState<string | null>(null);
    const [activeMessages, setActiveMessages] = useState<UserChatMessage[]>([]);
    const [newPeerIdInput, setNewPeerIdInput] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [copied, setCopied] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const activeChatId = useMemo(() => {
        if (!myId || !activePeerId) return null;
        return [myId, activePeerId].sort().join('_');
    }, [myId, activePeerId]);

    // Listen for all conversations for the sidebar
    useEffect(() => {
        if (!myId) return;
        
        // This query fetches the latest message for every conversation the user is in.
        // It requires a composite index on (participants, timestamp) in Firestore.
        const q = db.collection('chats')
            .where('participants', 'array-contains', myId)
            .orderBy('timestamp', 'desc');

        const unsubscribe = q.onSnapshot((querySnapshot) => {
            const convos: UserChatMessage[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                convos.push({
                    id: doc.id,
                    senderId: data.senderId,
                    recipientId: data.recipientId,
                    text: data.text,
                    timestamp: (data.timestamp as firebase.firestore.Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                });
            });
            setAllConversations(convos);
        });

        return () => unsubscribe();
    }, [myId]);

    // Listen for messages in the active chat
    useEffect(() => {
        if (!activeChatId) {
            setActiveMessages([]);
            return;
        };

        const messagesColRef = db.collection('chatMessages').doc(activeChatId).collection('messages');
        const q = messagesColRef.orderBy('timestamp', 'asc');

        const unsubscribe = q.onSnapshot((querySnapshot) => {
            const messages = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    senderId: data.senderId,
                    recipientId: data.recipientId,
                    text: data.text,
                    timestamp: (data.timestamp as firebase.firestore.Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                };
            });
            setActiveMessages(messages);
        });

        return () => unsubscribe();
    }, [activeChatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);
    
    const conversationSummaries = useMemo<ConversationSummary[]>(() => {
        if (!myId) return [];
        const uniquePeers = new Map<string, ConversationSummary>();
        allConversations.forEach(msg => {
            const peerId = msg.senderId === myId ? msg.recipientId : msg.senderId;
            if (!uniquePeers.has(peerId)) {
                uniquePeers.set(peerId, {
                    peerId,
                    lastMessage: msg.text,
                    timestamp: msg.timestamp,
                });
            }
        });
        return Array.from(uniquePeers.values());
    }, [allConversations, myId]);


    const handleStartChat = () => {
        const peerId = newPeerIdInput.trim();
        if (peerId && peerId !== myId) {
            setActivePeerId(peerId);
            setNewPeerIdInput('');
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activePeerId || !myId || !activeChatId) return;

        const messagesColRef = db.collection('chatMessages').doc(activeChatId).collection('messages');
        const chatDocRef = db.collection('chats').doc(activeChatId);

        const newMessagePayload = {
            senderId: myId,
            recipientId: activePeerId,
            text: messageInput.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // Add to messages subcollection
        await messagesColRef.add(newMessagePayload);
        
        // Update the top-level chat document for conversation list queries
        await chatDocRef.set({
            ...newMessagePayload,
            participants: [myId, activePeerId]
        });

        setMessageInput('');
    };

    const handleCopyToClipboard = () => {
        if (myId) {
            navigator.clipboard.writeText(myId).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    if (!myId) {
        return (
            <div className="flex h-full items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">Authenticating...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full animate-fade-in bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="w-full sm:w-1/3 md:w-1/4 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm p-3 rounded-md bg-gray-100 dark:bg-gray-700 text-center">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 block mb-1">Your Chat ID:</span>
                        <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-lg text-blue-600 dark:text-blue-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded truncate" title={myId}>
                                {myId}
                            </span>
                            <button onClick={handleCopyToClipboard} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 relative" aria-label="Copy ID">
                                {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardCopyIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Share this ID to chat with others.</p>
                    </div>
                </div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newPeerIdInput}
                            onChange={(e) => setNewPeerIdInput(e.target.value)}
                            placeholder="Enter a Chat ID to start"
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && handleStartChat()}
                        />
                        <button onClick={handleStartChat} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversationSummaries.map(convo => (
                        <button key={convo.peerId} onClick={() => setActivePeerId(convo.peerId)} className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activePeerId === convo.peerId ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{convo.peerId}</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{formatRelative(parseISO(convo.timestamp), new Date())}</p>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{convo.lastMessage}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {activePeerId ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Chat with {activePeerId}</h3>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {activeMessages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === myId ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-md p-3 rounded-lg ${msg.senderId === myId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">{format(new Date(msg.timestamp), 'p')}</p>
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
                                <button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500 disabled:opacity-50" disabled={!messageInput.trim()}><SendIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-8">
                        <UsersIcon className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select a chat</h3>
                        <p className="max-w-sm mt-2">Choose a conversation from the list, or start a new one by entering a user's ID.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatView;