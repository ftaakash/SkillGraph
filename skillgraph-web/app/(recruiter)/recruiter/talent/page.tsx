"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import TalentCard from "@/components/recruiter/TalentCard";
import SkillFilter from "@/components/recruiter/SkillFilter";
import { Users } from "lucide-react";

interface Skill { id: string; skillName: string; category: string; proficiency: string }
interface Student {
  id: string; name: string; email: string; college: string | null; branch: string | null;
  year: string | null; targetRole: string | null; readinessScore: number | null; cgpa: number | null; skills: Skill[];
}

export default function RecruiterTalentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/recruiter/talent").then(r => r.json()),
      fetch("/api/recruiter/shortlist").then(r => r.json()),
    ]).then(([t, s]) => {
      setStudents(t.candidates ?? []);
      const ids = new Set<string>((s.shortlist ?? []).map((v: { student: { id: string } }) => v.student.id));
      setShortlistedIds(ids);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const branches = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.branch) set.add(s.branch); });
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (branch) list = list.filter(s => s.branch === branch);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.targetRole?.toLowerCase().includes(q) ||
        s.skills.some(sk => sk.skillName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [students, search, branch]);

  const toggleShortlist = async (studentId: string) => {
    await fetch("/api/recruiter/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setShortlistedIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  return (
    <PageTransition>
      <DashboardLayout title="Talent Discovery">
        <div className="mb-4">
          <SkillFilter search={search} onSearchChange={setSearch} branches={branches} selectedBranch={branch} onBranchChange={setBranch} />
        </div>

        {/* Active Filter Chips */}
        {(search || branch) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {search && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-medium">
                Search: &ldquo;{search}&rdquo;
                <button onClick={() => setSearch("")} className="hover:text-primary/60 transition-colors leading-none">×</button>
              </span>
            )}
            {branch && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full font-medium">
                Branch: {branch}
                <button onClick={() => setBranch("")} className="hover:text-primary/60 transition-colors leading-none">×</button>
              </span>
            )}
            <button
              onClick={() => { setSearch(""); setBranch(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Users size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No talent matches your filters.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">{filtered.length} students found</p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(s => (
                <TalentCard
                  key={s.id}
                  student={s}
                  isShortlisted={shortlistedIds.has(s.id)}
                  onToggleShortlist={toggleShortlist}
                />
              ))}
            </div>
          </>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
