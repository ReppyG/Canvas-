import React from 'react';
import { Course } from '../types';
import { BookOpenIcon } from './icons/Icons';

const CourseCard: React.FC<{ course: Course; onClick: () => void; }> = ({ course, onClick }) => {
    // Generate a consistent, vibrant color based on the course ID
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500'];
    const color = colors[course.id % colors.length];

    return (
        <button onClick={onClick} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:border-blue-500/50 transform hover:-translate-y-1 w-full text-left">
            <div className={`h-20 ${color} flex items-center justify-center`}>
                 <BookOpenIcon className="w-10 h-10 text-white opacity-50" />
            </div>
            <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate" title={course.name}>{course.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{course.course_code}</p>
            </div>
        </button>
    );
};


interface CoursesViewProps {
    courses: Course[];
    onCourseClick: (courseId: number) => void;
    connectionStatus: 'live' | 'sample' | 'error';
}

const CoursesView: React.FC<CoursesViewProps> = ({ courses, onCourseClick, connectionStatus }) => {
    const renderEmptyState = () => {
        if (connectionStatus === 'live') {
            return (
                <div className="text-center py-20 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Connection Successful, No Courses Found</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">We connected to your Canvas account but couldn't find any active courses.</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This might be because the term hasn't started or your API token has limited permissions.</p>
                </div>
            );
        }
        // Default message for sample data mode or errors
        return (
            <div className="text-center py-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">No courses to display.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">If you expect to see courses, please check your settings.</p>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Courses</h1>
             {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.map(course => (
                        <CourseCard key={course.id} course={course} onClick={() => onCourseClick(course.id)} />
                    ))}
                </div>
            ) : (
                renderEmptyState()
            )}
        </div>
    );
};

export default CoursesView;