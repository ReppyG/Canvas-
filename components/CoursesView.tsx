import React from 'react';
import { Course } from '../types';
import { BookOpenIcon } from './icons/Icons';

const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
    // Generate a consistent, vibrant color based on the course ID
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500'];
    const color = colors[course.id % colors.length];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:border-blue-500/50 transform hover:-translate-y-1">
            <div className={`h-20 ${color} flex items-center justify-center`}>
                 <BookOpenIcon className="w-10 h-10 text-white opacity-50" />
            </div>
            <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate" title={course.name}>{course.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{course.course_code}</p>
            </div>
        </div>
    );
};


const CoursesView: React.FC<{ courses: Course[] }> = ({ courses }) => {
    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Courses</h1>
             {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.map(course => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">No courses found.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Connect to Canvas in Settings to see your courses.</p>
                </div>
            )}
        </div>
    );
};

export default CoursesView;