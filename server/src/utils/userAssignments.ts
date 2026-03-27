import { Department, ProjectPosition, Role, Section, Team } from '../models';

type UserAssignmentInput = {
    role?: unknown;
    department?: unknown;
    section?: unknown;
    team?: unknown;
    projectPosition?: unknown;
};

type UserAssignmentResult =
    | {
        success: true;
        data: {
            role?: string;
            department?: string;
            section?: string;
            team?: string;
            projectPosition?: string;
        };
    }
    | {
        success: false;
        status: number;
        message: string;
    };

const normalizeSingleAssignmentValue = (
    fieldLabel: string,
    value: unknown
): { value?: string; error?: string } => {
    if (value === undefined || value === null || value === '') {
        return { value: undefined };
    }

    if (Array.isArray(value)) {
        return { error: `${fieldLabel} must be a single value` };
    }

    if (typeof value !== 'string') {
        return { error: `${fieldLabel} must be a single value` };
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return { value: undefined };
    }

    if (trimmedValue.includes(',')) {
        return { error: `${fieldLabel} must be a single value` };
    }

    return { value: trimmedValue };
};

export const validateSingleUserAssignments = async (
    input: UserAssignmentInput
): Promise<UserAssignmentResult> => {
    const normalizedRole = normalizeSingleAssignmentValue('Role', input.role);
    if (normalizedRole.error) {
        return { success: false, status: 400, message: normalizedRole.error };
    }

    const normalizedDepartment = normalizeSingleAssignmentValue('Department', input.department);
    if (normalizedDepartment.error) {
        return { success: false, status: 400, message: normalizedDepartment.error };
    }

    const normalizedSection = normalizeSingleAssignmentValue('Section', input.section);
    if (normalizedSection.error) {
        return { success: false, status: 400, message: normalizedSection.error };
    }

    const normalizedTeam = normalizeSingleAssignmentValue('Team', input.team);
    if (normalizedTeam.error) {
        return { success: false, status: 400, message: normalizedTeam.error };
    }

    const normalizedProjectPosition = normalizeSingleAssignmentValue('Company position', input.projectPosition);
    if (normalizedProjectPosition.error) {
        return { success: false, status: 400, message: normalizedProjectPosition.error };
    }

    if (normalizedRole.value) {
        const existingRole = await Role.findOne({ key: normalizedRole.value, isActive: true });
        if (!existingRole) {
            return { success: false, status: 400, message: 'Role not found or inactive' };
        }
    }

    if (normalizedProjectPosition.value) {
        const existingProjectPosition = await ProjectPosition.findById(normalizedProjectPosition.value);
        if (!existingProjectPosition) {
            return { success: false, status: 400, message: 'Company position not found' };
        }
    }

    let resolvedDepartment = normalizedDepartment.value;
    let resolvedSection = normalizedSection.value;
    let resolvedTeam = normalizedTeam.value;

    if (resolvedDepartment) {
        const existingDepartment = await Department.findById(resolvedDepartment);
        if (!existingDepartment) {
            return { success: false, status: 400, message: 'Department not found' };
        }
    }

    if (resolvedSection) {
        const existingSection = await Section.findById(resolvedSection);
        if (!existingSection) {
            return { success: false, status: 400, message: 'Section not found' };
        }

        const sectionDepartmentId = String(existingSection.department);
        if (resolvedDepartment && sectionDepartmentId !== resolvedDepartment) {
            return {
                success: false,
                status: 400,
                message: 'Section does not belong to the selected department',
            };
        }

        resolvedDepartment = resolvedDepartment || sectionDepartmentId;
    }

    if (resolvedTeam) {
        const existingTeam = await Team.findById(resolvedTeam).populate('section', 'department');
        if (!existingTeam) {
            return { success: false, status: 400, message: 'Team not found' };
        }

        const teamDepartmentId = String(existingTeam.department);
        const teamSectionId =
            existingTeam.section && typeof existingTeam.section === 'object' && '_id' in existingTeam.section
                ? String(existingTeam.section._id)
                : existingTeam.section
                    ? String(existingTeam.section)
                    : undefined;

        if (resolvedDepartment && teamDepartmentId !== resolvedDepartment) {
            return {
                success: false,
                status: 400,
                message: 'Team does not belong to the selected department',
            };
        }

        if (resolvedSection && teamSectionId && teamSectionId !== resolvedSection) {
            return {
                success: false,
                status: 400,
                message: 'Team does not belong to the selected section',
            };
        }

        if (resolvedSection && !teamSectionId) {
            return {
                success: false,
                status: 400,
                message: 'The selected team is not assigned to a section',
            };
        }

        resolvedDepartment = teamDepartmentId;
        resolvedSection = teamSectionId;
    }

    return {
        success: true,
        data: {
            role: normalizedRole.value,
            department: resolvedDepartment,
            section: resolvedSection,
            team: resolvedTeam,
            projectPosition: normalizedProjectPosition.value,
        },
    };
};
