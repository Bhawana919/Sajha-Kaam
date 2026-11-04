// Shapes from the backend contract (generated into schema.d.ts by `npm run api:types`).
import type { components } from './schema';

type S = components['schemas'];
export type Me = S['MeOut'];
export type SampleIdentity = S['SampleIdentity'];
export type Tokens = S['Tokens'];
export type RegisterIn = S['RegisterIn'];
export type Person = S['PersonOut'];
export type Team = S['PodOut'];
export type Profile = S['ProfileOut'];
export type ProfileIn = S['ProfileIn'];
export type OpenTeam = S['OpenTeam'];
export type JoinIn = S['JoinIn'];
export type BlindRequest = S['BlindRequest'];
export type TeamView = S['TeamOut'];
export type Member = S['MemberOut'];
export type JobIn = S['JobIn'];
export type AnchorJobIn = S['AnchorJobIn'];
export type Job = S['JobOut'];
export type JobDetail = S['JobDetail'];
export type JobState = Job['state'];
export type Submission = S['SubmissionOut'];
export type FirstCheck = S['FirstCheck'];
export type Problem = S['Problem'];
export type CheckOut = S['CheckOut'];
export type Desk = S['DeskOut'];
export type JuniorHome = S['JuniorHome'];
export type ClientHome = S['ClientHome'];
export type Note = S['NoteOut'];
export type Notification = S['NotificationOut'];
export type LogEntry = S['LogEntryOut'];

export type SkillField = { key: string; label: string; example: string; required: boolean };
export type Skill = { id: string; en: string; ne: string; sample_hint: string };
export type Template = {
  skills: Skill[];
  levels: Record<string, { en: string; ne: string; means: string }>;
  required: string[];
  minimum_budget_minor: Record<string, number>;
  skill_fields: Record<string, SkillField[]>;
  done_when_examples: Record<string, string[]>;
};
