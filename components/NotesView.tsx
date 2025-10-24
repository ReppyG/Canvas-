import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Note } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebaseService';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { PlusIcon, TrashIcon, DocumentTextIcon } from './icons/Icons';
import { format } from 'date-fns';

const NotesView: React.FC = () => {
    const { user } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [currentTitle, setCurrentTitle] = useState('');
    const [currentContent, setCurrentContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const notesCollectionRef = useMemo(() => {
        return user ? db.collection('users').doc(user.id).collection('notes') : null;
    }, [user]);

    useEffect(() => {
        if (!notesCollectionRef) {
            setNotes([]);
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        const q = notesCollectionRef.orderBy('updatedAt', 'desc');

        const unsubscribe = q.onSnapshot((querySnapshot) => {
            const notesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    createdAt: (data.createdAt as firebase.firestore.Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                    updatedAt: (data.updatedAt as firebase.firestore.Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                } as Note;
            });
            setNotes(notesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notes:", error);
            setIsLoading(false);
        });

        // Deselect note when user changes
        setActiveNoteId(null);

        return () => unsubscribe();
    }, [notesCollectionRef]);

    const activeNote = useMemo(() => {
        return notes.find(note => note.id === activeNoteId);
    }, [notes, activeNoteId]);

    useEffect(() => {
        if (activeNote) {
            setCurrentTitle(activeNote.title);
            setCurrentContent(activeNote.content);
        } else {
            setCurrentTitle('');
            setCurrentContent('');
        }
    }, [activeNote]);

    const handleNewNote = async () => {
        if (!notesCollectionRef) return;
        const newNoteDoc = await notesCollectionRef.add({
            title: 'Untitled Note',
            content: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setActiveNoteId(newNoteDoc.id);
    };

    const handleSelectNote = (noteId: string) => {
        setActiveNoteId(noteId);
    };

    const handleNoteChange = useCallback(async (title: string, content: string) => {
        setCurrentTitle(title);
        setCurrentContent(content);

        if (activeNoteId && notesCollectionRef) {
             const noteDocRef = notesCollectionRef.doc(activeNoteId);
             await noteDocRef.update({
                 title,
                 content,
                 updatedAt: firebase.firestore.FieldValue.serverTimestamp()
             });
        }
    }, [activeNoteId, notesCollectionRef]);

    const handleDeleteNote = async (noteId: string) => {
        if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.') && notesCollectionRef) {
            await notesCollectionRef.doc(noteId).delete();
            if (activeNoteId === noteId) {
                setActiveNoteId(null);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>Loading notes...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 animate-fade-in">
            {/* Notes List */}
            <div className="w-1/3 h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Notes</h2>
                    <button
                        onClick={handleNewNote}
                        className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Create new note"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {notes.length > 0 ? (
                        <ul>
                            {notes.map(note => (
                                <li key={note.id}>
                                    <button
                                        onClick={() => handleSelectNote(note.id)}
                                        className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}
                                    >
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{note.title || 'Untitled Note'}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{note.content || 'No content'}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{format(new Date(note.updatedAt), 'PPp')}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            <p>No notes yet.</p>
                            <p className="text-sm">Click the '+' button to create one.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Note Editor */}
            <div className="flex-1 flex flex-col">
                {activeNote ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => handleDeleteNote(activeNote.id)}
                                className="p-2 rounded-md text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                                aria-label="Delete note"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col p-6">
                            <input
                                type="text"
                                value={currentTitle}
                                onChange={(e) => handleNoteChange(e.target.value, currentContent)}
                                placeholder="Note Title"
                                className="w-full text-2xl font-bold bg-transparent focus:outline-none text-gray-900 dark:text-white mb-4"
                            />
                            <textarea
                                value={currentContent}
                                onChange={(e) => handleNoteChange(currentTitle, e.target.value)}
                                placeholder="Start writing..."
                                className="w-full flex-1 bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 resize-none leading-relaxed"
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                        <DocumentTextIcon className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-semibold">Select a note</h3>
                        <p>Choose a note from the list on the left, or create a new one to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesView;