"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Megaphone, Plus, Trash2, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";

type Notice = {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  read: boolean;
  authorId: string | null;
  author: { name: string } | null;
  jobPosting: { id: string; title: string; company: string } | null;
};

const CATEGORIES = ["general", "announcement", "shortlist", "result"] as const;
const CATEGORY_TONE: Record<string, string> = {
  general: "border-border text-muted-foreground",
  announcement: "border-sky-500/30 text-sky-400",
  shortlist: "border-emerald-500/30 text-emerald-400",
  result: "border-amber-500/30 text-amber-400",
};

function ago(iso: string, now: number) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

function NoticeBoard() {
  const params = useSearchParams();
  const { data: session } = useSession();
  const faculty = session?.user?.role === "FACULTY";
  const job = params.get("job");

  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [joined, setJoined] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string | null>(params.get("id"));
  const [composing, setComposing] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (category) qs.set("category", category);
    if (job) qs.set("job", job);
    return fetch(`/api/notices?${qs}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setNotices(d.notices);
        setJoined(d.joinedCollege !== false);
        setNow(Date.now());
      })
      .catch(() => setError("Could not load notices."));
  }, [search, category, job]);

  useEffect(() => { load(); }, [load]);

  const current = useMemo(() => notices?.find(n => n.id === selected) ?? null, [notices, selected]);

  const open = (n: Notice) => {
    setSelected(n.id);
    setComposing(false);
    if (!n.read) {
      setNotices(list => list?.map(x => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      void fetch("/api/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) });
    }
  };

  const markAllRead = async () => {
    const ids = (notices ?? []).filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    await fetch("/api/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    await load();
  };

  const withdraw = async (id: string) => {
    if (!window.confirm("Withdraw this notice? Students will no longer see it.")) return;
    const res = await fetch(`/api/faculty/notices/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelected(null);
      await load();
    } else {
      setError((await res.json().catch(() => null))?.error ?? "Could not withdraw the notice");
    }
  };

  const unread = (notices ?? []).filter(n => !n.read).length;

  if (!joined) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
        Join your college workspace on your <Link href="/profile" className="text-primary hover:underline">Profile</Link> to see its notice board.
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-4">
      <div className="space-y-3">
        <form onSubmit={e => { e.preventDefault(); setSearch(query.trim()); }} className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notices" className="pl-9 bg-muted border-border text-sm" />
        </form>
        <div className="flex flex-wrap items-center gap-1.5">
          {["", ...CATEGORIES].map(c => (
            <button
              key={c || "all"}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`text-xs px-2.5 py-1 rounded-full border capitalize ${category === c ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c || "All"}
            </button>
          ))}
          {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline ml-auto">Mark all read</button>}
        </div>
        {job && <p className="text-xs text-muted-foreground">Showing notices for one drive. <Link href="/notices" className="text-primary hover:underline">Show all</Link></p>}
        {faculty && (
          <button
            onClick={() => { setComposing(true); setSelected(null); }}
            className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            <Plus size={14} /> New notice
          </button>
        )}
        <ul className="bg-card border border-border rounded-lg divide-y divide-border/60 max-h-[65vh] overflow-y-auto">
          {error && <li className="p-4 text-sm text-red-400" role="alert">{error}</li>}
          {notices === null && !error && <li className="p-6 text-sm text-muted-foreground text-center">Loading…</li>}
          {notices?.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">No notices yet.</li>}
          {notices?.map(n => (
            <li key={n.id}>
              <button
                onClick={() => open(n)}
                aria-current={current?.id === n.id}
                className={`w-full text-left px-4 py-3 transition-colors ${current?.id === n.id ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} aria-label={n.read ? undefined : "Unread"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.read ? "text-foreground" : "text-foreground font-semibold"}`}>{n.title}</p>
                      {now && <span className="text-[10px] text-muted-foreground shrink-0">{ago(n.createdAt, now)}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {n.author && <span className="text-[11px] text-muted-foreground truncate">{n.author.name}</span>}
                      <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${CATEGORY_TONE[n.category] ?? CATEGORY_TONE.general}`}>{n.category}</span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 min-h-[50vh]">
        {composing ? (
          <ComposeNotice onDone={async id => { setComposing(false); await load(); if (id) setSelected(id); }} defaultJob={job} />
        ) : current ? (
          <article>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">{current.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {current.author?.name ?? "Placement cell"} · {new Date(current.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${CATEGORY_TONE[current.category] ?? CATEGORY_TONE.general}`}>{current.category}</span>
                {/* The server allows the author or a college admin; others get an error message */}
                {faculty && (
                  <button onClick={() => withdraw(current.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400" aria-label="Withdraw notice">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            {current.jobPosting && (
              <Link
                href={faculty ? `/faculty/jobs/${current.jobPosting.id}` : `/jobs/${current.jobPosting.id}`}
                className="inline-block text-xs text-primary hover:underline mb-4"
              >
                {current.jobPosting.company} · {current.jobPosting.title}
              </Link>
            )}
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{current.body}</div>
          </article>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Megaphone size={32} className="mb-3" />
            Select a notice to read it.
          </div>
        )}
      </div>
    </div>
  );
}

function ComposeNotice({ onDone, defaultJob }: { onDone: (id?: string) => void | Promise<void>; defaultJob: string | null }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("general");
  const [jobs, setJobs] = useState<{ id: string; title: string; company: string }[]>([]);
  const [jobId, setJobId] = useState(defaultJob ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/faculty/jobs").then(r => (r.ok ? r.json() : null)).then(d => setJobs(d?.jobs ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/faculty/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, jobPostingId: jobId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Could not publish the notice");
      await onDone(data.notice?.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">New notice</h2>
        <button type="button" onClick={() => onDone()} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground" aria-label="Cancel"><X size={16} /></button>
      </div>
      <div>
        <label htmlFor="n-title" className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
        <input id="n-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required className="w-full rounded-md bg-muted border border-border text-sm p-2.5" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="n-cat" className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
          <select id="n-cat" value={category} onChange={e => setCategory(e.target.value as typeof category)} className="w-full rounded-md bg-muted border border-border text-sm p-2.5 capitalize">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="n-job" className="block text-xs font-medium text-muted-foreground mb-1.5">Drive (optional)</label>
          <select id="n-job" value={jobId} onChange={e => setJobId(e.target.value)} className="w-full rounded-md bg-muted border border-border text-sm p-2.5">
            <option value="">Not about a specific drive</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.company} · {j.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="n-body" className="block text-xs font-medium text-muted-foreground mb-1.5">Notice</label>
        <textarea id="n-body" value={body} onChange={e => setBody(e.target.value)} rows={12} required maxLength={20000} className="w-full rounded-md bg-muted border border-border text-sm p-3 resize-y" />
      </div>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">Every student in your college workspace gets an in-app notification.</p>
      <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
        {busy ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}

export default function NoticesPage() {
  return (
    <PageTransition>
      <DashboardLayout title="Notice Board">
        <Suspense fallback={null}>
          <NoticeBoard />
        </Suspense>
      </DashboardLayout>
    </PageTransition>
  );
}
