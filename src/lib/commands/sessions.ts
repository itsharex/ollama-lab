import type { Session, SessionCurrentModelReturn, SessionMode, SessionRenameReturn } from "~/lib/schemas/session";
import { invoke } from "@tauri-apps/api/core";

interface InternalSession {
  id: number;
  profileId: number;
  title: string | null;
  dateCreated: string;
  currentModel: string;
  mode: SessionMode,
}

export async function listSessions(mode: SessionMode): Promise<Session[]> {
  return await invoke<InternalSession[]>("list_sessions", { mode }).then((sessions) =>
    sessions.map(
      (session) =>
        ({
          ...session,
          dateCreated: new Date(session.dateCreated),
        }) satisfies Session,
    ),
  );
}

export async function getSession(id: number): Promise<Session | null> {
  return await invoke<InternalSession>("get_session", { id }).then(
    (session) =>
      ({
        ...session,
        dateCreated: new Date(session.dateCreated),
      }) satisfies Session,
  );
}

export async function deleteSession(id: number): Promise<number | null> {
  return await invoke<number | null>("delete_session", { id });
}

export async function renameSession(id: number, newName: string | null): Promise<SessionRenameReturn> {
  return await invoke<SessionRenameReturn>("rename_session", { id, newName });
}

export async function setSessionModel(id: number, model: string): Promise<SessionCurrentModelReturn> {
  return await invoke<SessionCurrentModelReturn>("set_session_model", {
    id,
    model,
  });
}

export async function createSession(mode: SessionMode, currentModel: string, title?: string | null): Promise<Session> {
  return await invoke<InternalSession>("create_session", {
    currentModel,
    title,
    mode,
  }).then(
    (session) =>
      ({
        ...session,
        dateCreated: new Date(session.dateCreated),
      }) satisfies Session,
  );
}
