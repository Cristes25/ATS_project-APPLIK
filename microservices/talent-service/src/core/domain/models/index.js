const sequelize = require('../../../infrastructure/database/sequelize');
const CandidateProfile = require('./CandidateProfile');
const WorkExperience = require('./WorkExperience');
const Education = require('./Education');
const Skill = require('./Skill');
const CandidateSkill = require('./CandidateSkill');
const Application = require('./Application');
const ApplicationStageHistory = require('./ApplicationStageHistory');
const Job = require('./Job');
const Candidate = require('./Candidate');
const Department = require('./Department');
const Tenant = require('./Tenant');
const Bookmark = require('./Bookmark');
const Notification = require('./Notification');
const EmailLog = require('./EmailLog');
const Employee = require('./Employee');
const ApplicationNote = require('./ApplicationNote');

// Define Relationships (1-N)
CandidateProfile.hasMany(WorkExperience, { foreignKey: 'profile_id', as: 'work_experiences' });
WorkExperience.belongsTo(CandidateProfile, { foreignKey: 'profile_id' });

CandidateProfile.hasMany(Education, { foreignKey: 'profile_id', as: 'educations' });
Education.belongsTo(CandidateProfile, { foreignKey: 'profile_id' });

CandidateProfile.hasMany(Application, { foreignKey: 'profile_id', as: 'applications' });
Application.belongsTo(CandidateProfile, { foreignKey: 'profile_id' });

CandidateProfile.hasMany(CandidateSkill, { foreignKey: 'profile_id', as: 'candidate_skills' });
CandidateSkill.belongsTo(CandidateProfile, { foreignKey: 'profile_id' });

Skill.hasMany(CandidateSkill, { foreignKey: 'skill_id', as: 'candidate_associations' });
CandidateSkill.belongsTo(Skill, { foreignKey: 'skill_id', as: 'skill_details' });

// Application Stage History
Application.hasMany(ApplicationStageHistory, { foreignKey: 'application_id', as: 'stage_history', onDelete: 'CASCADE' });
ApplicationStageHistory.belongsTo(Application, { foreignKey: 'application_id' });

// Application Notes
Application.hasMany(ApplicationNote, { foreignKey: 'application_id', as: 'notes', onDelete: 'CASCADE' });
ApplicationNote.belongsTo(Application, { foreignKey: 'application_id' });
ApplicationNote.belongsTo(Employee, { foreignKey: 'author_id', as: 'author' });
Employee.hasMany(ApplicationNote, { foreignKey: 'author_id', as: 'notes' });

// Cross-service read-only relations
Application.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });
CandidateProfile.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });
Candidate.hasOne(CandidateProfile, { foreignKey: 'candidate_id', as: 'profile' });
Job.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Job, { foreignKey: 'department_id', as: 'jobs' });
Job.belongsTo(Employee, { foreignKey: 'created_by', as: 'recruiter' });
Employee.hasMany(Job, { foreignKey: 'created_by', as: 'jobs' });
Job.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Tenant.hasMany(Job, { foreignKey: 'tenant_id', as: 'jobs' });
Bookmark.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });
Job.hasMany(Bookmark, { foreignKey: 'job_id', as: 'bookmarks' });
Candidate.hasMany(Notification, { foreignKey: 'candidate_id', as: 'notifications' });
Notification.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });
Candidate.hasMany(EmailLog, { foreignKey: 'candidate_id', as: 'email_logs' });
EmailLog.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

module.exports = {
    sequelize,
    CandidateProfile,
    WorkExperience,
    Education,
    Skill,
    CandidateSkill,
    Application,
    ApplicationStageHistory,
    Job,
    Candidate,
    Department,
    Tenant,
    Bookmark,
    Notification,
    EmailLog,
    Employee,
    ApplicationNote
};
