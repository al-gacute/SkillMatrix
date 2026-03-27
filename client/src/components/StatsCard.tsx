import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color = 'primary' }) => {
    const colorClasses: Record<string, string> = {
        primary: 'bg-primary-100 text-primary-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
        blue: 'bg-blue-100 text-blue-600',
        pink: 'bg-pink-100 text-pink-600',
    };

    return (
        <div className="card">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
