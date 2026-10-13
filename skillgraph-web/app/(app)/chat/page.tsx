"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Send, Reply, Trash2, X, MessagesSquare } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";

type Chat = { jobId: string; title: string; last: { author: string; body: string | null; at: string } | null; activityAt: string };
type Message = {
  id: string;
  body: string | null;
  deleted: boolean;
  replyToId: string | null;
  createdAt: string;
  mine: boolean;
  author: { name: string; isFaculty: boolean };
};

const POLL_MS = 8000;
const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayLabel = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });

function Thread({ jobId }: { jobId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("");
  const [canModerate, setCanModerate] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const newest = useRef<string | null>(null);

  const merge = useCallback((incoming: Message[]) => {
    if (!incoming.length) return;
    setMessages(list => {
      const seen = new Set(list.map(m => m.id));
      return [...list, ...incoming.filter(m => !seen.has(m.id))];
    });
    newest.current = incoming[incoming.length - 1].createdAt;
  }, []);

  useEffect(() => {
    let cancelled = false;
    newest.current = null;
    fetch(`/api/drives/${encodeURIComponent(jobId)}/messages`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        if (cancelled) return;
        setMessages(d.messages);
        setTitle(d.job ? `${d.job.company} · ${d.job.title}` : "");
        setCanModerate(d.canModerate);
        newest.current = d.messages.at(-1)?.createdAt ?? new Date(0).toISOString();
      })
      .catch(() => !cancelled && setError("You can't open this chat."));

    // Poll for new messages while the tab is visible
    const timer = setInterval(() => {
      if (document.hidden || !newest.current) return;
      fetch(`/api/drives/${encodeURIComponent(jobId)}/messages?after=${encodeURIComponent(newest.current)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => !cancelled && d && merge(d.messages))
        .catch(() => {});
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, merge]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/drives/${encodeURIComponent(jobId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, replyToId: replyTo?.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Message not sent");
      merge([data.message]);
      setDraft("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const remove = async (m: Message) => {
    if (!window.confirm("Delete this message?")) return;
    const res = await fetch(`/api/drives/${encodeURIComponent(jobId)}/messages?messageId=${encodeURIComponent(m.id)}`, { method: "DELETE" });
    if (res.ok) setMessages(list => list.map(x => (x.id === m.id ? { ...x, deleted: true, body: null } : x)));
  };

  const byId = useMemo(() => new Map(messages.map(m => [m.id, m])), [messages]);

  return (
    <div className="flex flex-col h-[72vh]">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-heading font-semibold text-foreground truncate">{title || "Drive chat"}</h2>
        <p className="text-xs text-muted-foreground">Applicants of this drive and your placement cell</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        {!error && messages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-10">No messages yet. Say hello.</p>}
        {messages.map((m, i) => {
          const parent = m.replyToId ? byId.get(m.replyToId) : null;
          const newDay = i === 0 || dayLabel.format(new Date(messages[i - 1].createdAt)) !== dayLabel.format(new Date(m.createdAt));
          return (
            <div key={m.id}>
              {newDay && <p className="text-center text-[11px] text-muted-foreground my-3">{dayLabel.format(new Date(m.createdAt))}</p>}
              <div className={`group flex flex-col max-w-[80%] ${m.mine ? "ml-auto items-end" : "items-start"}`}>
                <p className={`text-[11px] mb-0.5 ${m.author.isFaculty ? "text-primary" : "text-muted-foreground"}`}>
                  {m.mine ? "You" : m.author.name}{m.author.isFaculty ? " · Placement cell" : ""}
                </p>
                <div className={`rounded-lg px-3 py-2 text-sm ${m.mine ? "bg-primary/15 text-foreground" : "bg-muted text-foreground"}`}>
                  {parent && (
                    <div className="border-l-2 border-primary/50 pl-2 mb-1.5 text-xs text-muted-foreground">
                      <span className="block font-medium">{parent.author.name}</span>
                      <span className="line-clamp-2">{parent.deleted ? "Deleted message" : parent.body}</span>
                    </div>
                  )}
                  {m.deleted ? <span className="italic text-muted-foreground">Message deleted</span> : <span className="whitespace-pre-wrap break-words">{m.body}</span>}
                  <span className="ml-2 text-[10px] text-muted-foreground align-bottom">{time.format(new Date(m.createdAt))}</span>
                </div>
                {!m.deleted && (
                  <div className="flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => setReplyTo(m)} className="p-1 rounded text-muted-foreground hover:text-foreground" aria-label="Reply"><Reply size={12} /></button>
                    {(m.mine || canModerate) && (
                      <button onClick={() => remove(m)} className="p-1 rounded text-muted-foreground hover:text-red-400" aria-label="Delete message"><Trash2 size={12} /></button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="border-t border-border p-3">
        {replyTo && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 mb-2">
            <span className="truncate">Replying to {replyTo.author.name}: {replyTo.body}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={12} /></button>
          </div>
        )}
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">Message</label>
          <input
            id="chat-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Type a message"
            autoComplete="off"
            className="flex-1 rounded-md bg-muted border border-border text-sm px-3 py-2"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="p-2.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send">
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function Chats() {
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("job");
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/chats").then(r => (r.ok ? r.json() : null)).then(d => setChats(d?.chats ?? [])).catch(() => setChats([]));
  }, []);

  const shown = useMemo(() => (chats ?? []).filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase())), [chats, search]);
  const current = selected ?? shown[0]?.jobId ?? null;

  return (
    <div className="grid lg:grid-cols-[minmax(260px,340px)_1fr] bg-card border border-border rounded-lg overflow-hidden">
      <div className="border-r border-border">
        <div className="p-3 border-b border-border relative">
          <Search className="absolute left-6 top-5.5 text-muted-foreground" size={14} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" className="pl-8 h-9 bg-muted border-border text-sm" />
        </div>
        <ul className="max-h-[66vh] overflow-y-auto divide-y divide-border/60">
          {chats === null && <li className="p-4 text-sm text-muted-foreground">Loading…</li>}
          {chats?.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">Chats open for drives you apply to.</li>}
          {shown.map(c => (
            <li key={c.jobId}>
              <button
                onClick={() => router.replace(`/chat?job=${c.jobId}`)}
                aria-current={current === c.jobId}
                className={`w-full text-left px-4 py-3 transition-colors ${current === c.jobId ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <p className={`text-sm font-medium truncate ${current === c.jobId ? "text-primary" : "text-foreground"}`}>{c.title}</p>
                <p className="text-xs text-muted-foreground truncate">{c.last ? `${c.last.author}: ${c.last.body ?? "Message deleted"}` : "No messages yet"}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {current ? (
        <Thread key={current} jobId={current} />
      ) : (
        <div className="flex flex-col items-center justify-center text-sm text-muted-foreground h-[72vh]">
          <MessagesSquare size={32} className="mb-3" />
          Select a chat
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <PageTransition>
      <DashboardLayout title="Drive Chats">
        <Suspense fallback={null}>
          <Chats />
        </Suspense>
      </DashboardLayout>
    </PageTransition>
  );
}
