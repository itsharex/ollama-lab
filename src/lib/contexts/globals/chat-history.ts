import { createStore } from "solid-js/store";
import type { ChatHistory } from "~/lib/models/session";
import { createEffect, createMemo } from "solid-js";
import { reloadSession } from "./sessions";
import { getCurrentBranch } from "~/lib/commands/chat-history";
import { EditUserPrompt, IncomingUserPrompt } from "~/lib/models/chat";
import { createSession } from "~/lib/commands/sessions";
import { regenerateResponse, submitUserPrompt } from "~/lib/commands/chats";
import { convertResponseEvents } from "~/lib/utils/chat-streams";
import { switchBranch as switchBranchCommand } from "~/lib/commands/chat-history";
import { currentSession, setSessionId } from "./current-session";

export interface PromptSubmissionEvents {
  onRespond?: () => void;
  onScrollDown?: () => void;
}

export interface ChatHistoryStore {
  chatHistory: ChatHistory | null;
  loading: boolean;
}

const [chatHistoryStore, setChatHistoryStore] = createStore<ChatHistoryStore>({
  chatHistory: null,
  loading: false,
});

export const getChatHistoryStore = () => chatHistoryStore;

export function getChatHistory() {
  return chatHistoryStore.chatHistory;
}

const lastChat = createMemo(() => getChatHistory()?.chats.at(-1));

export async function reloadChatHistory() {
  const session = currentSession();
  if (session) {
    setChatHistoryStore("loading", true);
    const result = await getCurrentBranch(session.id);
    setChatHistoryStore("chatHistory", {
      chats: result,
    });
    setChatHistoryStore("loading", false);
  } else {
    setChatHistoryStore("chatHistory", null);
  }
}

createEffect(() => {
  reloadChatHistory();
});

export async function clearChatHistory() {
  setSessionId(null);
}

export async function submitChat(
  prompt: IncomingUserPrompt,
  model: string,
  { onRespond, onScrollDown }: PromptSubmissionEvents = {},
) {
  let session = currentSession() ?? undefined;

  if (!session) {
    // TODO: Add settings option for default session name: 1) no name, 2) first prompt, 3) generated after first response
    // Currently it is `first prompt`
    const sessionTitle = prompt.text.split("\n").at(0);
    session = await createSession(model, sessionTitle);

    await reloadSession(session.id);
    setSessionId(session.id);
  }

  const parentId = lastChat()?.id;

  const ctx = {
    responseIndex: -1,
  };

  const ret = await submitUserPrompt(
    session?.id,
    prompt,
    parentId === undefined ? null : parentId,
    convertResponseEvents(ctx, getChatHistory, setChatHistoryStore, model, prompt, {
      onRespond,
      onScrollDown,
    }),
  );

  setChatHistoryStore("chatHistory", "chats", ctx.responseIndex, {
    status: "sent",
    dateSent: ret.dateCreated,
  });
}

export async function regenerate(
  chatId: number,
  model?: string,
  { onRespond, onScrollDown }: PromptSubmissionEvents = {},
) {
  const session = currentSession();
  if (!session) {
    return;
  }

  const ctx = {
    responseIndex: -1,
  };

  const ret = await regenerateResponse(
    session.id,
    chatId,
    model,
    convertResponseEvents(
      ctx,
      getChatHistory,
      setChatHistoryStore,
      model,
      undefined,
      {
        onRespond,
        onScrollDown,
      },
      {
        regenerateFor: chatId,
      },
    ),
  );

  if (ctx.responseIndex >= 0) {
    setChatHistoryStore("chatHistory", "chats", ctx.responseIndex, {
      status: "sent",
      dateSent: ret.dateCreated,
    });
  }
}

export async function switchBranch(chatId: number) {
  const [parentId, subbranch] = await switchBranchCommand(chatId);

  const ch = getChatHistory();
  if (!ch) {
    return;
  }

  const index = parentId !== null ? ch.chats.findIndex((chat) => chat.id === parentId) + 1 : 0;
  if (index >= 0) {
    setChatHistoryStore("chatHistory", "chats", (chats) => [...chats.slice(0, index), ...subbranch]);
  }
}

export async function editPrompt(
  prompt: EditUserPrompt,
  chatId: number,
  model: string,
  { onRespond, onScrollDown }: PromptSubmissionEvents = {},
) {
  const session = currentSession();
  if (!session) {
    return;
  }

  const ch = getChatHistory();
  if (!ch) {
    throw new Error("No chat history.");
  }

  const curIndex = ch.chats.findIndex((value) => value.id === chatId);
  if (curIndex < 0) {
    throw new Error("Original chat not found.");
  }

  const parentId = curIndex === 0 ? null : ch.chats[curIndex - 1].id;

  const ctx = {
    responseIndex: -1,
  };

  const curPrompt: IncomingUserPrompt = {
    text: ch.chats[chatId].content,
  };

  const mergedPrompt: IncomingUserPrompt = { ...curPrompt, ...prompt };

  const ret = await submitUserPrompt(
    session.id,
    mergedPrompt,
    parentId,
    convertResponseEvents(
      ctx,
      getChatHistory,
      setChatHistoryStore,
      model,
      mergedPrompt,
      { onRespond, onScrollDown },
      { regenerateFor: ch.chats[curIndex].id },
    ),
  );

  if (ctx.responseIndex >= 0) {
    setChatHistoryStore("chatHistory", "chats", ctx.responseIndex, {
      status: "sent",
      dateSent: ret.dateCreated,
    });
  }
}
