/**
 * AI CONTENT STORAGE SERVICE
 * Automatically saves all AI-generated content to Firebase
 * Makes the AI a true "personal knowledge assistant"
 */

import { db } from './firebaseService';
import firebase from 'firebase/compat/app';
import { SavedAIContent, KnowledgeEntry, StudyPlan, Summary } from '../types';

// ============================================================================
// SAVED AI CONTENT MANAGEMENT
// ============================================================================

export class AIContentStorage {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * Save any AI-generated content
     */
    async saveContent(params: {
        type: 'summary' | 'notes' | 'study_plan' | 'chat' | 'analysis';
        title: string;
        content: any;
        sourceType?: 'assignment' | 'document' | 'conversation';
        sourceId?: string;
        tags?: string[];
        metadata?: any;
    }): Promise<string> {
        const content: Omit<SavedAIContent, 'id'> = {
            userId: this.userId,
            type: params.type,
            title: params.title,
            content: params.content,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: params.tags || [],
            isFavorite: false,
            metadata: params.metadata,
        };

        const docRef = await db
            .collection('users')
            .doc(this.userId)
            .collection('aiContent')
            .add({
                ...content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        return docRef.id;
    }

    /**
     * Get all saved content
     */
    async getAllContent(): Promise<SavedAIContent[]> {
        const snapshot = await db
            .collection('users')
            .doc(this.userId)
            .collection('aiContent')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
            updatedAt: doc.data().updatedAt?.toDate().toISOString(),
        } as SavedAIContent));
    }

    /**
     * Get content by type
     */
    async getContentByType(type: SavedAIContent['type']): Promise<SavedAIContent[]> {
        const snapshot = await db
            .collection('users')
            .doc(this.userId)
            .collection('aiContent')
            .where('type', '==', type)
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
            updatedAt: doc.data().updatedAt?.toDate().toISOString(),
        } as SavedAIContent));
    }

    /**
     * Search content
     */
    async searchContent(query: string): Promise<SavedAIContent[]> {
        const allContent = await this.getAllContent();
        
        const lowerQuery = query.toLowerCase();
        return allContent.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            JSON.stringify(item.content).toLowerCase().includes(lowerQuery) ||
            item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Toggle favorite
     */
    async toggleFavorite(contentId: string): Promise<void> {
        const docRef = db
            .collection('users')
            .doc(this.userId)
            .collection('aiContent')
            .doc(contentId);

        const doc = await docRef.get();
        const current = doc.data()?.isFavorite || false;

        await docRef.update({
            isFavorite: !current,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    /**
     * Delete content
     */
    async deleteContent(contentId: string): Promise<void> {
        await db
            .collection('users')
            .doc(this.userId)
            .collection('aiContent')
            .doc(contentId)
            .delete();
    }

    /**
     * Update content
     */
    async updateContent(contentId: string, updates: Partial<SavedAIContent>): Promise<void> {
        await db
            .collection('users')
            .doc(this.userId)
            .collection('aiContent')
            .doc(contentId)
            .update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
    }
}

// ============================================================================
// KNOWLEDGE BASE MANAGEMENT
// ============================================================================

export class KnowledgeBase {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * Add knowledge entry
