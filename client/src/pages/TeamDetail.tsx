import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { teamService } from '../services';
import CategoryColorDot from '../components/CategoryColorDot';
import { User, Department, Section } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

interface TeamDetailData {
  _id: string;
  name: string;
  description?: string;
  department: Department;
  section?: Section;
  lead?: User;
  members: User[];
  skillDistribution: Array<{
    _id: {
      skillId: string;
      skillName: string;
      categoryName: string;
      categoryColor: string;
    };
    count: number;
    avgExperience: number;
    proficiencyLevels: string[];
  }>;
}

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const getCompanyPositionLabel = (member: User) => {
    if (!member.projectPosition) {
      return 'No company position';
    }

    return typeof member.projectPosition === 'string'
      ? member.projectPosition
      : member.projectPosition.name;
  };

  useEffect(() => {
    const fetchTeam = async () => {
      if (!id) return;
      try {
        const response = await teamService.getTeam(id);
        if (response.success && response.data) {
          setTeam(response.data as TeamDetailData);
        }
      } catch (error) {
        console.error('Failed to fetch team:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Team not found</p>
        <Link to="/teams" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Teams
        </Link>
      </div>
    );
  }

  const skillChartData = team.skillDistribution.slice(0, 10).map((item) => ({
    name: item._id.skillName,
    count: item.count,
    color: item._id.categoryColor,
  }));

  return (
    <div className="space-y-6">
      <Link to="/teams" className="flex items-center text-gray-500 hover:text-gray-700 text-sm">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            {team.description && <p className="text-gray-600 mt-2">{team.description}</p>}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                {team.department.name}
              </span>
              {team.section && (
                <span className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                  {team.section.name}
                </span>
              )}
              <span className="text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-full">
                {team.members.length} members
              </span>
            </div>
            {team.lead && (
              <p className="text-sm text-gray-600 mt-4">
                Team Lead: <span className="font-medium">{team.lead.firstName} {team.lead.lastName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
          {team.members.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No members in this team</p>
          ) : (
            <div className="space-y-3">
              {team.members.map((member) => (
                <Link
                  key={member._id || member.id}
                  to={`/users/${member._id || member.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{getCompanyPositionLabel(member)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Skill Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Skills</h2>
          {skillChartData.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No skills data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillChartData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Members with skill">
                  {skillChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Skill Breakdown */}
      {team.skillDistribution.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Breakdown</h2>
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
                    Members
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Experience
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {team.skillDistribution.map((item) => (
                  <tr key={item._id.skillId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item._id.skillName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CategoryColorDot color={item._id.categoryColor} size="sm" />
                        <span className="text-sm text-gray-600">{item._id.categoryName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.avgExperience ? `${item.avgExperience.toFixed(1)} years` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetail;
