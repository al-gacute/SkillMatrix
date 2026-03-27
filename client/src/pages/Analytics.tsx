import React, { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { analyticsService, departmentService, teamService } from '../services';
import { Department, Team } from '../types';
import CategoryColorDot from '../components/CategoryColorDot';
import LoadingSpinner from '../components/LoadingSpinner';

interface SkillGap {
    skill: {
        id: string;
        name: string;
        category: {
            name: string;
            color: string;
        };
    };
    usersWithSkill: number;
    totalUsers: number;
    coverage: number;
}

interface TopEndorser {
    _id: string;
    firstName: string;
    lastName: string;
    title?: string;
    endorsementCount: number;
}

interface TrendData {
    skillsAdded: Array<{ _id: { date: string }; count: number }>;
    endorsements: Array<{ _id: { date: string }; count: number }>;
    trendingSkills: Array<{ skillName: string; endorsementCount: number }>;
}

const Analytics: React.FC = () => {
    const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
    const [topEndorsers, setTopEndorsers] = useState<TopEndorser[]>([]);
    const [trends, setTrends] = useState<TrendData | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ departmentId: '', teamId: '' });

    useEffect(() => {
        const fetchFilters = async () => {
            const [deptRes, teamRes] = await Promise.all([
                departmentService.getDepartments(),
                teamService.getTeams(),
            ]);
            if (deptRes.success) setDepartments(deptRes.data || []);
            if (teamRes.success) setTeams(teamRes.data || []);
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [gapsRes, endorsersRes, trendsRes] = await Promise.all([
                    analyticsService.getSkillGaps(filters),
                    analyticsService.getTopEndorsers(),
                    analyticsService.getTrends(),
                ]);

                if (gapsRes.success) setSkillGaps(gapsRes.data || []);
                if (endorsersRes.success) setTopEndorsers(endorsersRes.data || []);
                if (trendsRes.success) setTrends(trendsRes.data || null);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    if (loading) {
        return <LoadingSpinner />;
    }

    // Prepare trend chart data
    const trendChartData = trends?.skillsAdded.map((item) => ({
        date: item._id.date.slice(5), // MM-DD format
        skills: item.count,
        endorsements: trends.endorsements.find((e) => e._id.date === item._id.date)?.count || 0,
    })) || [];

    // Skill gaps - show low coverage skills
    const lowCoverageSkills = skillGaps.filter((g) => g.coverage < 50).slice(0, 10);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                <p className="text-gray-500 mt-1">Insights into your organization's skill landscape</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <select
                    value={filters.departmentId}
                    onChange={(e) => setFilters({ ...filters, departmentId: e.target.value, teamId: '' })}
                    className="input w-48"
                >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                            {dept.name}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.teamId}
                    onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                    className="input w-48"
                >
                    <option value="">All Teams</option>
                    {teams
                        .filter(
                            (t) =>
                                !filters.departmentId ||
                                (t.department as Department)?._id === filters.departmentId ||
                                t.department === filters.departmentId
                        )
                        .map((team) => (
                            <option key={team._id} value={team._id}>
                                {team.name}
                            </option>
                        ))}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Skill Trends */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trends</h2>
                    {trendChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="skills"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Skills Added"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="endorsements"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Endorsements"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                            No trend data available
                        </div>
                    )}
                </div>

                {/* Top Endorsers */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Endorsers</h2>
                    {topEndorsers.length > 0 ? (
                        <div className="space-y-3">
                            {topEndorsers.map((endorser, index) => (
                                <div key={endorser._id} className="flex items-center gap-4">
                                    <span
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : index === 1
                                                    ? 'bg-gray-200 text-gray-700'
                                                    : index === 2
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {index + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                            {endorser.firstName} {endorser.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500">{endorser.title || 'No title'}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-primary-600">
                                        {endorser.endorsementCount} endorsements
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">No endorsement data available</div>
                    )}
                </div>
            </div>

            {/* Skill Gaps */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Gaps Analysis</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Skills with less than 50% coverage in the selected scope
                </p>
                {lowCoverageSkills.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Skill
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Coverage
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Users
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {lowCoverageSkills.map((gap) => (
                                    <tr key={gap.skill.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {gap.skill.name}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <CategoryColorDot color={gap.skill.category.color} size="sm" />
                                                <span className="text-sm text-gray-600">{gap.skill.category.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${gap.coverage < 20 ? 'bg-red-500' : gap.coverage < 35 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${gap.coverage}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-gray-600">{gap.coverage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {gap.usersWithSkill} / {gap.totalUsers}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        No skill gaps identified - great coverage!
                    </div>
                )}
            </div>

            {/* Trending Skills */}
            {trends?.trendingSkills && trends.trendingSkills.length > 0 && (
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Trending Skills (Last 30 Days)</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={trends.trendingSkills}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="skillName" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="endorsementCount" fill="#3b82f6" name="Endorsements" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default Analytics;
