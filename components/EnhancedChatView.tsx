import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChatConversation, ChatMessage, AiTutorMessage } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebaseService';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { 
    UsersIcon, SendIcon, PlusIcon, SearchIcon, PinIcon, ArchiveIcon, 
    EditIcon, TrashIcon, SparklesIcon, SettingsIcon, MoreVerticalIcon,
    MessageCircleIcon, XIcon, CheckIcon
} from './icons/Icons';
import { format, formatRelative, parseISO } from 'date-fns';
import { generateGroundedText } from '../services/geminiService';

const EnhancedChatView: React.FC = () => {
    const { user } = useAuth();
    const myId = user?.id;
    
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [newChatTitle, setNewChatTitle] = useState('');
    const [isRenamingChat, setIsRenamingChat] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
    const [isAiMode, setIsAiMode] = useState(false);
    const [enableWebSearch, setEnableWebSearch] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowChatMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load conversations
    useEffect(() => {
        if (!myId) return;
        
        const unsubscribe = db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .orderBy('updatedAt', 'desc')
            .onSnapshot((snapshot) => {
                const convos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate().toISOString(),
                    updatedAt: doc.data().updatedAt?.toDate().toISOString(),
                } as ChatConversation));
                setConversations(convos);
            });

        return () => unsubscribe();
    }, [myId]);

    // Load messages for active conversation
    useEffect(() => {
        if (!myId || !activeConversation) {
            setMessages([]);
            return;
        }

        const unsubscribe = db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(activeConversation.id)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                const msgs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toISOString(),
                } as ChatMessage));
                setMessages(msgs);
            });

        return () => unsubscribe();
    }, [myId, activeConversation]);

    const createNewConversation = useCallback(async () => {
        if (!myId || !newChatTitle.trim()) return;

        const conversationRef = db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc();

        const newConvo: Omit<ChatConversation, 'id'> = {
            title: newChatTitle.trim(),
            type: 'personal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPinned: false,
            category: 'general',
        };

        await conversationRef.set({
            ...newConvo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        setNewChatTitle('');
        setIsCreatingChat(false);
        setActiveConversation({ id: conversationRef.id, ...newConvo });
    }, [myId, newChatTitle]);

    const renameConversation = useCallback(async (conversationId: string, newTitle: string) => {
        if (!myId || !newTitle.trim()) return;

        await db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(conversationId)
            .update({
                title: newTitle.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        setIsRenamingChat(false);
    }, [myId]);

    const togglePinConversation = useCallback(async (conversationId: string, isPinned: boolean) => {
        if (!myId) return;

        await db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(conversationId)
            .update({
                isPinned: !isPinned,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
    }, [myId]);

    const deleteConversation = useCallback(async (conversationId: string) => {
        if (!myId || !confirm('Are you sure? This will delete all messages in this conversation.')) return;

        // Delete all messages first
        const messagesSnapshot = await db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .get();

        const batch = db.batch();
        messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Delete conversation
        await db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(conversationId)
            .delete();

        if (activeConversation?.id === conversationId) {
            setActiveConversation(null);
        }
    }, [myId, activeConversation]);

    const sendMessage = useCallback(async () => {
        if (!myId || !activeConversation || !messageInput.trim()) return;

        const userMessage: Omit<ChatMessage, 'id'> = {
            conversationId: activeConversation.id,
            senderId: myId,
            senderName: user?.email || 'You',
            content: messageInput.trim(),
            timestamp: new Date().toISOString(),
            type: 'text',
        };

        const messagesRef = db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(activeConversation.id)
            .collection('messages');

        await messagesRef.add({
            ...userMessage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Update conversation last message
        await db
            .collection('users')
            .doc(myId)
            .collection('conversations')
            .doc(activeConversation.id)
            .update({
                lastMessage: messageInput.trim().slice(0, 100),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        const currentInput = messageInput;
        setMessageInput('');

        // AI Response
        if (isAiMode) {
            setIsLoading(true);
            try {
                const history = messages.map(m => `${m.senderName}: ${m.content}`).join('\n\n');
                const fullPrompt = history + `\n\nUser: ${currentInput}`;

                let aiResponse;
                if (enableWebSearch) {
                    const result = await generateGroundedText(fullPrompt);
                    aiResponse = {
                        content: result.text,
                        sources: result.sources,
                    };
                } else {
                    // Use regular AI generation (implement this in geminiService)
                    aiResponse = {
                        content: `AI Response to: ${currentInput}`,
                        sources: [],
                    };
                }

                const aiMessage: Omit<ChatMessage, 'id'> = {
                    conversationId: activeConversation.id,
                    senderId: 'ai',
                    senderName: 'AI Assistant',
                    content: aiResponse.content,
                    timestamp: new Date().toISOString(),
                    type: 'ai_response',
                    metadata: {
                        sources: aiResponse.sources,
                        model: enableWebSearch ? 'gemini-2.5-flash-grounding' : 'gemini-2.5-flash',
                    },
                };

                await messagesRef.add({
                    ...aiMessage,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                });

            } catch (error) {
                console.error('AI error:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [myId, activeConversation, messageInput, isAiMode, enableWebSearch, messages, user]);

    const filteredConversations = useMemo(() => {
        let filtered = conversations;
        
        if (searchQuery.trim()) {
            filtered = filtered.filter(c => 
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort: pinned first, then by updatedAt
        return filtered.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime();
        });
    }, [conversations, searchQuery]);

    if (!user) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-gray-600 dark:text-gray-400">Please sign in to use chat.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full animate-fade-in bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Sidebar */}
            <div className="w-full sm:w-80 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
                {/* Search & New Chat */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setIsCreatingChat(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <PlusIcon className="w-4 h-4" />
                        New Conversation
                    </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.map(convo => (
                        <div
                            key={convo.id}
                            className={`relative group p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                                activeConversation?.id === convo.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                            <div onClick={() => setActiveConversation(convo)}>
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {convo.isPinned && <PinIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {convo.title}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowChatMenu(showChatMenu === convo.id ? null : convo.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                                    >
                                        <MoreVerticalIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {convo.lastMessage || 'No messages yet'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {formatRelative(parseISO(convo.updatedAt), new Date())}
                                </p>
                            </div>

                            {/* Context Menu */}
                            {showChatMenu === convo.id && (
                                <div
                                    ref={menuRef}
                                    className="absolute right-4 top-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10 py-1 min-w-40"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            togglePinConversation(convo.id, convo.isPinned);
                                            setShowChatMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                        <PinIcon className="w-4 h-4" />
                                        {convo.isPinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsRenamingChat(true);
                                            setActiveConversation(convo);
                                            setShowChatMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                        Rename
                                    </button>
                                    <button
                                        onClick={() => {
                                            deleteConversation(convo.id);
                                            setShowChatMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                                    {activeConversation.title}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {messages.length} messages
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        checked={isAiMode}
                                        onChange={(e) => setIsAiMode(e.target.checked)}
                                        className="rounded"
                                    />
                                    <SparklesIcon className="w-4 h-4 text-blue-500" />
                                    AI Mode
                                </label>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.senderId === myId ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xl p-3 rounded-lg ${
                                            msg.senderId === myId
                                                ? 'bg-blue-600 text-white'
                                                : msg.type === 'ai_response'
                                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                                                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}
                                    >
                                        <p className="text-xs font-medium mb-1 opacity-75">{msg.senderName}</p>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        
                                        {/* AI Sources */}
                                        {msg.metadata?.sources && msg.metadata.sources.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold mb-2">Sources:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.metadata.sources.map((source: any, i: number) => (
                                                        <a
                                                            key={i}
                                                            href={source.uri}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded hover:bg-purple-300 dark:hover:bg-purple-700"
                                                        >
                                                            {source.title}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <p className="text-xs opacity-50 mt-2">
                                            {format(parseISO(msg.timestamp), 'p')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                            <span className="text-sm text-purple-900 dark:text-purple-100">AI is thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            {isAiMode && (
                                <div className="mb-3 flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={enableWebSearch}
                                            onChange={(e) => setEnableWebSearch(e.target.checked)}
                                            className="rounded"
                                        />
                                        Enable Web Search
                                    </label>
                                </div>
                            )}
                            <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                                    placeholder={isAiMode ? "Ask AI anything..." : "Type a message..."}
                                    disabled={isLoading}
                                    className="flex-1 bg-transparent p-2 focus:outline-none text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !messageInput.trim()}
                                    className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-8">
                        <MessageCircleIcon className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No conversation selected</h3>
                        <p className="max-w-sm mt-2">Choose a conversation from the list or create a new one to get started.</p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {isCreatingChat && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsCreatingChat(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Conversation</h2>
                        <input
                            type="text"
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && createNewConversation()}
                            placeholder="Conversation title..."
                            autoFocus
                            className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setIsCreatingChat(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createNewConversation}
                                disabled={!newChatTitle.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {isRenamingChat && activeConversation && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsRenamingChat(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rename Conversation</h2>
                        <input
                            type="text"
                            defaultValue={activeConversation.title}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    renameConversation(activeConversation.id, (e.target as HTMLInputElement).value);
                                }
                            }}
                            placeholder="New title..."
                            autoFocus
                            className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setIsRenamingChat(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={(e) => {
                                    const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement;
                                    renameConversation(activeConversation.id, input.value);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Export additional icons needed
const MoreVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
);

const PinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
    </svg>
);

const ArchiveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="5" rx="2"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>
    </svg>
);

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
    </svg>
);

export default EnhancedChatView;
