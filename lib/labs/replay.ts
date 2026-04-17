import { v4 as uuidv4 } from "uuid";
import {
  addReplayEvent,
  clearReplayEvents,
  getLabProgress,
  getReplayEvents,
  resetLabProgress,
  upsertLabProgress,
} from "../db.ts";
import {
  filterCompletedPhaseIds,
  getLabById,
  getReplayStatus,
} from "./index.ts";
import type { Lab, ReplaySurface, TerminalAction } from "./index.ts";

export interface ReplayProgressPayload {
  status: "not_started" | "in_progress" | "completed";
  completedPhaseIds: string[];
  startedAt?: number;
  completedAt?: number;
}

export interface ReplayEventPayload {
  id: string;
  surface: string;
  eventType: string;
  title: string;
  detail: string;
  severity: string;
  phaseId?: string;
  artifactId?: string;
  createdAt: number;
}

export interface ReplayActionResponse {
  surface: ReplaySurface;
  output?: string;
  reply?: string;
  progress: ReplayProgressPayload;
  events: ReplayEventPayload[];
  newlyCompletedPhaseIds: string[];
  objectiveReached: boolean;
  reset?: boolean;
}

interface ReplayEventDraft {
  surface: string;
  eventType: string;
  title: string;
  detail: string;
  severity: string;
  phaseId?: string;
  artifactId?: string;
}

let eventCounter = 0;

function toClientEvent(draft: ReplayEventDraft): ReplayEventPayload {
  const createdAt = Date.now() + eventCounter++;
  return {
    id: uuidv4(),
    surface: draft.surface,
    eventType: draft.eventType,
    title: draft.title,
    detail: draft.detail,
    severity: draft.severity,
    phaseId: draft.phaseId,
    artifactId: draft.artifactId,
    createdAt,
  };
}

async function persistClientEvents(
  userId: string,
  labId: string,
  events: ReplayEventPayload[]
) {
  for (const event of events) {
    await addReplayEvent(
      event.id,
      userId,
      labId,
      event.surface,
      event.eventType,
      event.title,
      event.detail,
      event.severity,
      event.phaseId,
      event.artifactId
    );
  }
}

export async function normalizeReplayProgress(
  lab: Lab,
  userId: string,
  labId: string
): Promise<ReplayProgressPayload> {
  const row = await getLabProgress(userId, labId);
  const completedPhaseIds = row
    ? filterCompletedPhaseIds(lab, JSON.parse(row.completed_tasks) as string[])
    : [];
  const status = getReplayStatus(lab, completedPhaseIds);

  return {
    status,
    completedPhaseIds,
    startedAt: row?.started_at ?? undefined,
    completedAt: status === "completed" ? row?.completed_at ?? undefined : undefined,
  };
}

async function persistProgress(
  lab: Lab,
  userId: string,
  completedPhaseIds: string[]
): Promise<ReplayProgressPayload> {
  const filtered = filterCompletedPhaseIds(lab, completedPhaseIds);
  const status = getReplayStatus(lab, filtered);
  const existing = await getLabProgress(userId, lab.id);
  const now = Math.floor(Date.now() / 1000);

  if (filtered.length === 0) {
    await resetLabProgress(userId, lab.id);
    return { status: "not_started", completedPhaseIds: [] };
  }

  await upsertLabProgress(
    existing?.id ?? uuidv4(),
    userId,
    lab.id,
    status,
    filtered,
    existing?.started_at ?? now,
    status === "completed" ? now : null
  );

  return {
    status,
    completedPhaseIds: filtered,
    startedAt: existing?.started_at ?? now,
    completedAt: status === "completed" ? now : undefined,
  };
}

function matchesRule(input: string, matchAll?: string[], matchAny?: string[]) {
  const normalized = input.toLowerCase();
  const allOk = !matchAll || matchAll.every((needle) => normalized.includes(needle.toLowerCase()));
  const anyOk = !matchAny || matchAny.some((needle) => normalized.includes(needle.toLowerCase()));
  return allOk && anyOk;
}

function makePhaseEvents(
  lab: Lab,
  phaseIds: string[],
  surface: ReplaySurface
): ReplayEventPayload[] {
  return phaseIds
    .map((phaseId) => {
      const phase = lab.replay.phases.find((item) => item.id === phaseId);
      if (!phase) return null;
      return toClientEvent({
        surface,
        eventType: "phase_completed",
        title: `Phase completed: ${phase.title}`,
        detail: phase.summary,
        severity: "success",
        phaseId,
      });
    })
    .filter((item): item is ReplayEventPayload => Boolean(item));
}

function resolveTerminalOutput(action: TerminalAction, completedPhaseIds: string[]) {
  if (
    action.completedWhenPhase &&
    action.completedOutput &&
    completedPhaseIds.includes(action.completedWhenPhase)
  ) {
    return action.completedOutput;
  }
  return action.output;
}

export async function getReplayEventsForClient(
  userId: string,
  labId: string
): Promise<ReplayEventPayload[]> {
  const rows = await getReplayEvents(userId, labId);
  return rows.map((event) => ({
    id: event.id,
    surface: event.surface,
    eventType: event.event_type,
    title: event.title,
    detail: event.detail,
    severity: event.severity,
    phaseId: event.phase_id ?? undefined,
    artifactId: event.artifact_id ?? undefined,
    createdAt: event.created_at,
  }));
}

export async function resetReplayState(userId: string, labId: string) {
  await clearReplayEvents(userId, labId);
  await resetLabProgress(userId, labId);
}

export async function runReplayAction(params: {
  userId: string;
  labId: string;
  surface: ReplaySurface;
  input: string;
}): Promise<ReplayActionResponse> {
  const { userId, labId, surface, input } = params;
  const lab = getLabById(labId);
  if (!lab) throw new Error("Lab not found");

  const trimmed = input.trim();
  const normalizedInput = trimmed.toLowerCase();
  const currentProgress = await normalizeReplayProgress(lab, userId, labId);
  const currentPhases = currentProgress.completedPhaseIds;

  if (surface === "terminal") {
    const action = lab.replay.terminalActions[normalizedInput];
    if (!action) {
      return {
        surface,
        output: `Command not found: ${normalizedInput}\nType 'help' for a list of available commands.`,
        progress: currentProgress,
        events: [],
        newlyCompletedPhaseIds: [],
        objectiveReached: currentPhases.includes(lab.replay.objectivePhaseId),
      };
    }

    if (action.reset) {
      await resetReplayState(userId, labId);
      return {
        surface,
        output: action.output,
        progress: { status: "not_started", completedPhaseIds: [] },
        events: [],
        newlyCompletedPhaseIds: [],
        objectiveReached: false,
        reset: true,
      };
    }

    if (
      action.requiresCompletedPhases &&
      action.requiresCompletedPhases.some((phaseId) => !currentPhases.includes(phaseId))
    ) {
      return {
        surface,
        output: action.unmetOutput ?? "[!] Replay prerequisites are not satisfied yet.",
        progress: currentProgress,
        events: [],
        newlyCompletedPhaseIds: [],
        objectiveReached: currentPhases.includes(lab.replay.objectivePhaseId),
      };
    }

    if (
      action.blockedByPhases &&
      action.blockedByPhases.some((phaseId) => currentPhases.includes(phaseId))
    ) {
      const blockedOutput = action.blockedOutput ?? resolveTerminalOutput(action, currentPhases);
      const blockedEvents = [
        toClientEvent({
          surface,
          eventType: "blocked",
          title: `Mitigation blocked: ${action.summary}`,
          detail: blockedOutput,
          severity: "success",
        }),
      ];
      await persistClientEvents(userId, labId, blockedEvents);
      return {
        surface,
        output: blockedOutput,
        progress: currentProgress,
        events: blockedEvents,
        newlyCompletedPhaseIds: [],
        objectiveReached: currentPhases.includes(lab.replay.objectivePhaseId),
      };
    }

    const nextPhases = filterCompletedPhaseIds(lab, [
      ...currentPhases,
      ...(action.phasesCompleted ?? []),
    ]);
    const newlyCompletedPhaseIds = nextPhases.filter(
      (phaseId) => !currentPhases.includes(phaseId)
    );
    const progress = await persistProgress(lab, userId, nextPhases);
    const eventDrafts: ReplayEventDraft[] = [];

    if (action.eventTitle && action.eventDetail) {
      eventDrafts.push({
        surface,
        eventType: "action",
        title: action.eventTitle,
        detail: action.eventDetail,
        severity: action.severity ?? "info",
      });
    }

    const newEvents = [
      ...eventDrafts.map(toClientEvent),
      ...makePhaseEvents(lab, newlyCompletedPhaseIds, surface),
    ];
    await persistClientEvents(userId, labId, newEvents);

    return {
      surface,
      output: resolveTerminalOutput(action, progress.completedPhaseIds),
      progress,
      events: newEvents,
      newlyCompletedPhaseIds,
      objectiveReached: progress.completedPhaseIds.includes(lab.replay.objectivePhaseId),
    };
  }

  const attack = lab.replay.attack;
  if (!attack) throw new Error("Attack surface not enabled for this lab");

  const newEvents: ReplayEventPayload[] = [
    toClientEvent({
      surface,
      eventType: "user_message",
      title: "Attack input submitted",
      detail: trimmed,
      severity: "info",
    }),
  ];

  let reply = attack.fallbackReply;
  let nextPhases = currentPhases;
  let newlyCompletedPhaseIds: string[] = [];
  let matchedBlockedRule = false;

  const matchedRule = attack.rules.find((rule) =>
    matchesRule(trimmed, rule.matchAll, rule.matchAny)
  );

  if (matchedRule) {
    const blocked =
      matchedRule.blockedByPhases &&
      matchedRule.blockedByPhases.some((phaseId) => currentPhases.includes(phaseId));

    if (blocked) {
      reply = matchedRule.blockedReply ?? attack.mitigatedReply;
      matchedBlockedRule = true;
    } else {
      reply = matchedRule.reply;
      nextPhases = filterCompletedPhaseIds(lab, [
        ...currentPhases,
        ...(matchedRule.phasesCompleted ?? []),
      ]);
      newlyCompletedPhaseIds = nextPhases.filter(
        (phaseId) => !currentPhases.includes(phaseId)
      );
    }
  }

  const progress = await persistProgress(lab, userId, nextPhases);

  newEvents.push(
    toClientEvent({
      surface,
      eventType: "assistant_message",
      title: matchedBlockedRule
        ? "Replay blocked by mitigation"
        : matchedRule
          ? matchedRule.eventTitle
          : "Replay attack rejected",
      detail: reply,
      severity: matchedBlockedRule ? "success" : matchedRule?.severity ?? "warning",
      phaseId: newlyCompletedPhaseIds[0],
    })
  );

  const phaseEvents = makePhaseEvents(lab, newlyCompletedPhaseIds, surface);
  const persistedEvents = [...newEvents, ...phaseEvents];
  await persistClientEvents(userId, labId, persistedEvents);

  return {
    surface,
    reply,
    progress,
    events: persistedEvents,
    newlyCompletedPhaseIds,
    objectiveReached: progress.completedPhaseIds.includes(lab.replay.objectivePhaseId),
  };
}
