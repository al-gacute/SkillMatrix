# SkillMatrix Application Guardrails

This document defines the target product and architecture rules for the SkillMatrix application.

## Objective

SkillMatrix is the system of record for employee capability data and must support:

- workforce capability visibility
- skill gap analysis
- training planning
- resource planning and staffing
- competency development tracking

## Mandatory Proficiency Standard

SkillMatrix uses one fixed 9-level proficiency scale across all modules, APIs, and reports.

| Level | Name | Description |
| --- | --- | --- |
| 1 | Novice / Entry | Little or no experience. Requires constant supervision and step-by-step instructions. |
| 2 | Advanced Beginner | Basic understanding. Performs simple tasks but needs support for routine issues. |
| 3 | Competent | Handles routine tasks independently. Can troubleshoot common problems. |
| 4 | Proficient | Efficient performance in most circumstances. Understands the "why" behind tasks. |
| 5 | Skilled / Experienced | Actively and sufficiently performing with high quality. Operates with minimal supervision. |
| 6 | Advanced | Performance is above average. Possesses in-depth knowledge of specific tools or processes. |
| 7 | Expert | Performs complex tasks under no supervision. Recognized as a go-to person in the team. |
| 8 | Master / Lead | Experienced enough to lead small teams or complex projects. Mentors juniors. |
| 9 | Authority / Mentor | Subject Matter Expert (SME). Defines best practices, trains others, and drives innovation. |

Rules:

- level values must be integers from `1` to `9`
- proficiency names and descriptions are canonical master data
- UI and reporting must display levels as `L4 - Proficient`

## Target Domain Model

The required business entities are:

- `Employee`
- `Skill`
- `SkillCategory`
- `ProficiencyScaleLevel`
- `Role`
- `RoleSkillRequirement`
- `EmployeeSkillAssessment`
- `Certification`
- `EmployeeCertification`
- `Training`
- `EmployeeTraining`

Current repository mapping:

- `User` currently acts as the employee record
- `Skill`, `SkillCategory`, `Role`, and `Assessment` exist in partial form
- certifications, training, role-skill requirements, and canonical proficiency master data are not fully modeled yet

## Domain Rules

### Skill Levels

- skill level must be between `1` and `9`
- completed assessments must not allow null or negative levels
- skill levels must reference the canonical proficiency scale

### Skill Assessments

- employee must exist and be active
- skill must exist and be active
- `AssessmentDate` cannot be in the future
- `AssessedBy` must be a valid authorized user
- history must be preserved; valid assessments are append-only
- current skill level is derived from the latest valid assessment

### Role Skill Requirements

- `(RoleID, SkillID)` must be unique
- required level must be between `1` and `9`
- mandatory skills must appear in gap analysis even with no employee assessment

### Certifications

- `ExpiryDate` cannot be earlier than `IssueDate`
- expired certifications must be flagged automatically
- expiry notifications should be generated ahead of expiration

### Employees

- `EmployeeNumber` must be unique
- inactive employees are excluded from active workforce reporting by default

## Architecture Guardrails

SkillMatrix must follow layered architecture:

- Presentation Layer
- Application Layer
- Domain Layer
- Infrastructure Layer

Rules:

- business rules belong in the domain layer
- UI must not contain business rules
- domain code must not depend on UI frameworks
- infrastructure must not determine domain behavior

## Database Guardrails

- master data belongs in dedicated tables or collections
- avoid redundant skill data storage
- enforce unique constraints where required
- recommended audit fields:
  - `CreatedBy`
  - `CreatedDate`
  - `UpdatedBy`
  - `UpdatedDate`
- optional soft-delete fields:
  - `IsDeleted`
  - `DeletedDate`
  - `DeletedBy`

## UI Guardrails

Required screens:

- Dashboard
- Employee Profile
- Skill Matrix
- Gap Analysis

Required behaviors:

- fast skill visibility
- filtering by department, role, and skill category
- Excel export for matrix-style views
- filtering without full page reload

## Security

Role-based access must cover:

- `Admin`
- `Manager / Assessor`
- `Employee`

The current repository can keep its implementation-specific role keys, but those keys must map cleanly to the business roles above.

## Performance, Audit, and Testing

- optimize skill matrix queries for large datasets
- index major filter and join keys
- paginate large result sets
- cache master data
- audit skill assessments, certification updates, training completion, and administrative changes
- include functional, security, and data-integrity test coverage for these rules

## Implementation Note

Until the remaining target entities are introduced, changes to `User`, `UserSkill`, and `Assessment` should move the codebase toward these guardrails rather than creating competing parallel concepts.
