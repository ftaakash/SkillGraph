"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Download, FileOutput } from "lucide-react";

interface PlacementRecord {
  id: string;
  studentId: string;
  company: string;
  role: string;
  ctcLpa: number | null;
  offerDate: string | null;
  batch: string | null;
  isVerified: boolean;
}

export default function FacultyReportsPage() {
  const [records, setRecords] = useState<PlacementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faculty/reports")
      .then(r => r.json())
      .then(d => { setRecords(d.records ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const header = "Student ID,Company,Role,CTC (LPA),Offer Date,Batch,Verified\n";
    const rows = records.map(r =>
      `${r.studentId},${r.company},${r.role},${r.ctcLpa ?? ""},${r.offerDate ?? ""},${r.batch ?? ""},${r.isVerified}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "placement_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition>
      <DashboardLayout title="Placement Reports">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground text-sm">{records.length} records for NAAC/NBA reporting</p>
          <Button onClick={exportCsv} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
            <Download className="mr-2" size={16} /> Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <FileOutput size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No placement records yet.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                  <th className="p-3">Company</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">CTC</th>
                  <th className="p-3">Offer Date</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">Verified</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">{r.company}</td>
                    <td className="p-3 text-muted-foreground">{r.role}</td>
                    <td className="p-3 text-primary font-semibold">{r.ctcLpa ? `₹${r.ctcLpa} LPA` : "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{r.offerDate ? new Date(r.offerDate).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.batch ?? "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.isVerified ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {r.isVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
}
