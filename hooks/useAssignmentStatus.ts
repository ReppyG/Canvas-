import { useState, useEffect, useCallback, useMemo } from 'react';
import { Assignment, AssignmentStatus } from '../types';
import { storage } from '../services/storageService';

const ASSIGNMENT_STATUS_KEY = 'studentPlatformAssignmentStatuses';

/**
 * A custom hook to manage the status of assignments, persisting changes to local storage.
 * @param assignments The raw list of assignments from the data source.
 * @returns An object containing the assignments merged with their current statuses, and a handler to update statuses.
 */
export const useAssignmentStatus = (assignments: Assignment[]) => {
    const [statuses, setStatuses] = useState<Record<number, AssignmentStatus>>({});

    // Load statuses from storage on initial mount
    useEffect(() => {
        const loadStatuses = async () => {
            const storedStatuses = await storage.get<Record<number, AssignmentStatus>>(ASSIGNMENT_STATUS_KEY);
            if (storedStatuses) {
                setStatuses(storedStatuses);
            }
        };
        loadStatuses();
    }, []);

    // Initialize statuses for any new assignments that aren't already in the state
    useEffect(() => {
        if (assignments.length > 0) {
            const newStatusesToSet: Record<number, AssignmentStatus> = {};
            for (const a of assignments) {
                // If a status for this assignment ID doesn't already exist, initialize it from the assignment data.
                if (statuses[a.id] === undefined) {
                    newStatusesToSet[a.id] = a.status || 'NOT_STARTED';
                }
            }
            if (Object.keys(newStatusesToSet).length > 0) {
                 setStatuses(prev => ({ ...prev, ...newStatusesToSet }));
            }
        }
    }, [assignments, statuses]);

    const handleStatusChange = useCallback(async (assignmentId: number, status: AssignmentStatus) => {
        const newStatuses = { ...statuses, [assignmentId]: status };
        setStatuses(newStatuses);
        await storage.set(ASSIGNMENT_STATUS_KEY, newStatuses);
    }, [statuses]);
    
    // Create a memoized list of assignments that includes the latest status from our state
    const assignmentsWithStatus = useMemo(() => {
        return assignments.map(a => ({
            ...a,
            status: statuses[a.id] || a.status || 'NOT_STARTED',
        }));
    }, [assignments, statuses]);

    return { assignmentsWithStatus, handleStatusChange };
};