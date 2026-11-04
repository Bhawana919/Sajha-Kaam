// One hook per screen need. Mutations refresh exactly the lists they change.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/state/session';

import { api } from './client';
import type {
  AnchorJobIn, BlindRequest, CheckOut, ClientHome, Desk, JobDetail, JobIn, JoinIn, JuniorHome, LogEntry, Me, Note, Notification, Room,
  OpenTeam, Profile, ProfileIn, RegisterIn, SampleIdentity, TeamView, Template, Tokens,
} from './types';

const signedIn = () => !!useSession.getState().tokens;
/** Screens refresh themselves while open, so phones watching the same job update each other live. */
const LIVE = 4000;

// ---------- session ----------
export function useSamples() {
  return useQuery({ queryKey: ['samples'], queryFn: () => api<SampleIdentity[]>('/v1/auth/samples', { auth: false }) });
}

function useSignIn<V>(fn: (v: V) => Promise<Tokens>) {
  const qc = useQueryClient();
  const save = useSession((s) => s.save);
  return useMutation({
    mutationFn: async (v: V) => {
      const tokens = await fn(v);
      await save(tokens);
      qc.clear();
      return api<Me>('/v1/me');
    },
  });
}

export const useSampleLogin = () =>
  useSignIn((user_id: string) => api<Tokens>('/v1/auth/sample-login', { method: 'POST', body: { user_id }, auth: false }));
export const useLogin = () =>
  useSignIn((b: { email: string; password: string }) => api<Tokens>('/v1/auth/login', { method: 'POST', body: b, auth: false }));
export const useRegister = () =>
  useSignIn((b: RegisterIn) => api<Tokens>('/v1/auth/register', { method: 'POST', body: b, auth: false }));

export function useMe() {
  const has = useSession((s) => !!s.tokens);
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/v1/me'), enabled: has });
}

export function useSignOut() {
  const qc = useQueryClient();
  const clear = useSession((s) => s.clear);
  return async () => {
    await clear();
    qc.clear();
  };
}

// ---------- shared ----------
export function useTemplate() {
  return useQuery({ queryKey: ['template'], queryFn: () => api<Template>('/v1/agreement/template', { auth: false }),
    staleTime: Infinity });
}

export function useJob(id: string) {
  return useQuery({ queryKey: ['job', id], queryFn: () => api<JobDetail>(`/v1/jobs/${id}`), enabled: signedIn() && !!id,
    refetchInterval: LIVE });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('/v1/notifications'),
    enabled: signedIn(), refetchInterval: 10000 });
}

export function useReadAll() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api('/v1/notifications/read', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
}

/** After any change to a job, refresh every list that might show it. */
function useJobChanged() {
  const qc = useQueryClient();
  return () => {
    for (const key of ['job', 'desk', 'team', 'junior-home', 'client-home', 'logbook', 'notes', 'notifications']) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

function useAction<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const changed = useJobChanged();
  return useMutation({ mutationFn: fn, onSuccess: changed });
}

// ---------- anchor ----------
export const useDesk = () =>
  useQuery({ queryKey: ['desk'], queryFn: () => api<Desk>('/v1/anchor/desk'), enabled: signedIn(), refetchInterval: LIVE + 1000 });
export const useTeam = () => useQuery({ queryKey: ['team'], queryFn: () => api<TeamView>('/v1/anchor/team'), enabled: signedIn() });
export const useNotes = () => useQuery({ queryKey: ['notes'], queryFn: () => api<Note[]>('/v1/anchor/notes'), enabled: signedIn() });
export const useRequests = () =>
  useQuery({ queryKey: ['requests'], queryFn: () => api<BlindRequest[]>('/v1/anchor/requests'), enabled: signedIn() });

export const useWriteJob = () =>
  useAction((j: AnchorJobIn) => api<{ id: string }>('/v1/anchor/jobs', { method: 'POST', body: j }));
export const useEditJob = () =>
  useAction((v: { id: string; job: JobIn }) => api<{ id: string }>(`/v1/jobs/${v.id}`, { method: 'PUT', body: v.job }));
export const useProposeChange = () =>
  useAction((v: { id: string; deadline_days: number; budget_minor: number; note: string }) => {
    const { id, ...body } = v;
    return api(`/v1/jobs/${id}/change`, { method: 'POST', body });
  });
/** A Team Leader, or a ★★★★★ Mentor, applies for a job a client posted to everyone. The client chooses. */
export const useApply = () =>
  useAction((v: { id: string; note: string; video_link: string }) =>
    api<JobDetail>(`/v1/jobs/${v.id}/apply`, { method: 'POST', body: { note: v.note, video_link: v.video_link } }));
export const useAssign = () =>
  useAction((v: { id: string; junior_id: string }) => api(`/v1/jobs/${v.id}/assign`, { method: 'POST', body: { junior_id: v.junior_id } }));
export const useApprove = () => useAction((submissionId: string) => api(`/v1/submissions/${submissionId}/approve`, { method: 'POST' }));
export const useSendBack = () =>
  useAction((v: { id: string; note: string }) => api(`/v1/submissions/${v.id}/send-back`, { method: 'POST', body: { note: v.note } }));
/** Pause a member's next automatic promotion, once, with a reason the member sees. */
export const usePausePromotion = () =>
  useAction((v: { junior_id: string; reason: string }) =>
    api(`/v1/anchor/members/${v.junior_id}/pause`, { method: 'POST', body: { reason: v.reason } }));
/** Lower a member's badge (badges only go up by the rules), with a reason the member sees. */
export const useSetLevel = () =>
  useAction((v: { junior_id: string; level: number; reason: string }) =>
    api(`/v1/anchor/members/${v.junior_id}/level`, { method: 'POST', body: { level: v.level, reason: v.reason } }));

export function useSeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { seats_open: number; test_task: string }) => api('/v1/anchor/seats', { method: 'PUT', body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; accept: boolean }) =>
      api(`/v1/anchor/requests/${v.id}/decide`, { method: 'POST', body: { accept: v.accept } }),
    onSuccess: () => {
      for (const key of ['requests', 'team', 'desk']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useInvite = () => useMutation({ mutationFn: () => api<{ code: string }>('/v1/anchor/invites', { method: 'POST' }) });

export function useNoteActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['notes'] });
  return {
    add: useMutation({ mutationFn: (text: string) => api('/v1/anchor/notes', { method: 'POST', body: { text } }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api(`/v1/anchor/notes/${id}`, { method: 'DELETE' }), onSuccess: done }),
  };
}

// ---------- junior ----------
export const useJuniorHome = () =>
  useQuery({ queryKey: ['junior-home'], queryFn: () => api<JuniorHome>('/v1/junior/home'), enabled: signedIn(),
    refetchInterval: LIVE + 1000 });
export const useOpenTeams = () =>
  useQuery({ queryKey: ['open-teams'], queryFn: () => api<OpenTeam[]>('/v1/teams/open'), enabled: signedIn() });
export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/v1/me/profile'), enabled: signedIn() });
export const useLogbook = () => useQuery({ queryKey: ['logbook'], queryFn: () => api<LogEntry[]>('/v1/me/logbook'), enabled: signedIn() });

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ProfileIn) => api<Profile>('/v1/me/profile', { method: 'PUT', body: p }),
    onSuccess: (p) => {
      qc.setQueryData(['profile'], p);
      for (const key of ['junior-home', 'open-teams']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: JoinIn & { team_id: string }) => {
      const { team_id, ...body } = v;
      return api(`/v1/teams/${team_id}/join`, { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['open-teams'] }),
  });
}

export const useAnswerBrief = () =>
  useAction((v: { id: string; accept: boolean }) => api(`/v1/jobs/${v.id}/brief`, { method: 'POST', body: { accept: v.accept } }));

export const useSubmit = () =>
  useAction((v: { id: string; link: string; content: string; note: string }) => {
    const { id, ...body } = v;
    return api(`/v1/jobs/${id}/submit`, { method: 'POST', body });
  });

// ---------- client ----------
export const useClientHome = () =>
  useQuery({ queryKey: ['client-home'], queryFn: () => api<ClientHome>('/v1/client/home'), enabled: signedIn(),
    refetchInterval: LIVE + 1000 });
export const useCheckAgreement = () =>
  useMutation({ mutationFn: (j: JobIn) => api<CheckOut>('/v1/agreement/check', { method: 'POST', body: j, auth: false }) });
export const usePostJob = () => useAction((j: JobIn) => api<{ id: string }>('/v1/jobs', { method: 'POST', body: j }));
/** Agree to an agreement: the client to one their Anchor wrote, or the Anchor to one their client sent. */
export const useAgree = () => useAction((id: string) => api(`/v1/jobs/${id}/agree`, { method: 'POST' }));
// ---------- the job room ----------
export const useRoom = (jobId: string, enabled = true) =>
  useQuery({ queryKey: ['room', jobId], queryFn: () => api<Room>(`/v1/jobs/${jobId}/room`), enabled: signedIn() && enabled,
    refetchInterval: LIVE + 1000 });

export function useRoomActions(jobId: string) {
  const qc = useQueryClient();
  const done = (room: Room) => qc.setQueryData(['room', jobId], room);
  const base = `/v1/jobs/${jobId}/room`;
  return {
    addTask: useMutation({ mutationFn: (b: { title: string; due_date: string }) => api<Room>(`${base}/tasks`, { method: 'POST', body: b }),
      onSuccess: done }),
    setDone: useMutation({ mutationFn: (v: { id: string; done: boolean }) =>
      api<Room>(`${base}/tasks/${v.id}`, { method: 'PATCH', body: { done: v.done } }), onSuccess: done }),
    removeTask: useMutation({ mutationFn: (id: string) => api<Room>(`${base}/tasks/${id}`, { method: 'DELETE' }), onSuccess: done }),
    addFile: useMutation({ mutationFn: (b: { label: string; link: string }) => api<Room>(`${base}/files`, { method: 'POST', body: b }),
      onSuccess: done }),
  };
}

/** Whether the server can sign video uploads (Cloudinary set up), and the limits. */
export const useUploads = () =>
  useQuery({ queryKey: ['uploads'], staleTime: Infinity,
    queryFn: () => api<{ video: boolean; max_seconds: number; max_mb: number }>('/v1/uploads', { auth: false }) });

/** Demo payment (no real money): held until the client accepts the work. */
export const usePay = () => useAction((id: string) => api(`/v1/jobs/${id}/pay`, { method: 'POST' }));
export const useChoose = () =>
  useAction((v: { id: string; application_id: string }) =>
    api<JobDetail>(`/v1/jobs/${v.id}/choose`, { method: 'POST', body: { application_id: v.application_id } }));
export const useRequestChanges = () =>
  useAction((v: { id: string; note: string }) => api(`/v1/jobs/${v.id}/request-changes`, { method: 'POST', body: { note: v.note } }));
export const useDecideChange = () =>
  useAction((v: { id: string; accept: boolean }) => api(`/v1/jobs/${v.id}/change/decide`, { method: 'POST', body: { accept: v.accept } }));
export const useAccept = () =>
  useAction((v: { id: string; show_client: boolean }) => api(`/v1/jobs/${v.id}/accept`, { method: 'POST', body: { show_client: v.show_client } }));
