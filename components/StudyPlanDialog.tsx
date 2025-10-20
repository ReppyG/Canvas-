import React, { useState, useEffect } from 'react';
import { Assignment, Course, StudyPlan, StudyPlanStep } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import { XIcon, ClockIcon, SparklesIcon } from './icons/Icons';

interface StudyPlanDialogProps {
  assignment: Assignment;
  course: Course;
  isOpen: boolean;
  onClose: () => void;
}

const SkeletonLoader: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="h-4 bg-gray-600 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-600 rounded w-full"></div>
        </div>
        <div className="h-6 bg-gray-700/50 rounded w-1/4"></div>
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                <div className="h-5 bg-gray-600 rounded w-3/4"></div>
                <div className="h-3 bg-gray-600 rounded w-full"></div>
                <div className="h-3 bg-gray-600 rounded w-5/6"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
            </div>
        ))}
    </div>
);

const Progress: React.FC<{ value: number }> = ({ value }) => (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{width: `${value}%`}}></div>
    </div>
);

const PriorityBadge: React.FC<{ priority: 'high' | 'medium' | 'low' }> = ({ priority }) => {
    const styles = {
        high: 'bg-red-500/20 text-red-400',
        medium: 'bg-yellow-500/20 text-yellow-400',
        low: 'bg-green-500/20 text-green-400'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${styles[priority]}`}>{priority}</span>
}

const StudyPlanDialog: React.FC<StudyPlanDialogProps> = ({ assignment, course, isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStepToggle = (stepIndex: number, isCompleted: boolean) => {
    if (!plan) return;
    const updatedSteps = plan.steps.map((step, index) => 
        index === stepIndex ? { ...step, completed: isCompleted } : step
    );
    setPlan({ ...plan, steps: updatedSteps });
  };
  
  useEffect(() => {
    const fetchPlan = async () => {
      if (!isOpen || plan) return;
      setIsGenerating(true);
      setError(null);
      try {
        // Fix: Call generateStudyPlan with the full assignment object and handle the returned StudyPlan object
        const resultPlan = await generateStudyPlan(assignment);
        
        if (resultPlan) {
            // Add the 'completed' field for UI state tracking
            const planWithState: StudyPlan = {
                ...resultPlan,
                steps: resultPlan.steps.map(step => ({ ...step, completed: false }))
            };
            setPlan(planWithState);
        } else {
            setError("[AI Error] The AI returned an empty or invalid study plan.");
        }
      } catch (e: any) {
        console.error("Failed to generate or parse study plan", e);
        setError(e.message || "[Client Error] Failed to generate the study plan.");
      } finally {
        setIsGenerating(false);
      }
    };
    fetchPlan();
  }, [isOpen, assignment, course, plan]);

  if (!isOpen) return null;

  const completedSteps = plan?.steps.filter(s => s.completed).length || 0;
  const totalSteps = plan?.steps.length || 0;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-gray-800 rounded-xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-4 border-b border-gray-700">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-400"/> AI Study Plan</h2>
                    {/* Fix: use 'name' property */}
                    <p className="text-sm text-gray-400 mt-1">{assignment.name}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon/></button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
                {isGenerating && <SkeletonLoader />}
                {error && <div className="text-red-400 bg-red-900/50 border border-red-700 p-4 rounded-lg">{error}</div>}
                {plan && (
                    <div className="space-y-6">
                        {/* Progress Overview */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white">Overall Progress</span>
                                <span className="text-sm text-gray-400">{completedSteps} / {totalSteps} steps</span>
                            </div>
                            <Progress value={progressPercentage} />
                            <p className="text-xs text-gray-400 mt-2 text-center">Estimated completion time: {plan.estimatedHours} hours</p>
                        </div>

                        {/* Steps */}
                        <div className="space-y-4">
                            <h3 className="text-base font-semibold text-white">Actionable Steps</h3>
                            {plan.steps.map((step, index) => (
                                <div key={index} className={`bg-gray-900/50 p-4 rounded-lg border border-gray-700 transition-opacity ${step.completed ? 'opacity-60' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        <input
                                            type="checkbox"
                                            checked={step.completed}
                                            onChange={(e) => handleStepToggle(index, e.target.checked)}
                                            className="mt-1 h-5 w-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-white">Step {step.order}: {step.title}</h4>
                                                <PriorityBadge priority={step.priority} />
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">{step.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                                                <div className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5"/> {step.estimatedMinutes} min</div>
                                            </div>
                                            {step.resources && step.resources.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-xs font-semibold text-gray-300">Resources:</p>
                                                    <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 mt-1">
                                                        {step.resources.map((res, i) => <li key={i}>{res}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                         {/* Milestones */}
                        {plan.milestones && plan.milestones.length > 0 && (
                            <div>
                                <h3 className="text-base font-semibold text-white mb-4">Key Milestones</h3>
                                <div className="space-y-3">
                                    {plan.milestones.map((milestone, index) => (
                                        <div key={index} className="flex items-start gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <div className="mt-1 h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-semibold text-blue-300">{milestone.completionPercentage}%</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{milestone.name}</p>
                                                <p className="text-sm text-gray-400">{milestone.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors">Close</button>
            </div>
        </div>
    </div>
  );
};

export default StudyPlanDialog;
