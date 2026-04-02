"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ArrowRight } from "lucide-react";

interface JobPostFormProps {
  onSuccess?: () => void;
  apiEndpoint?: string;
}

export default function JobPostForm({ onSuccess, apiEndpoint = "/api/faculty/jobs" }: JobPostFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    ctcMin: "",
    ctcMax: "",
    minCgpa: "",
    eligibleBranches: "CSE, IT, ECE",
    deadline: "",
    driveDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ctcMin: form.ctcMin ? parseFloat(form.ctcMin) : undefined,
          ctcMax: form.ctcMax ? parseFloat(form.ctcMax) : undefined,
          minCgpa: form.minCgpa ? parseFloat(form.minCgpa) : undefined,
          eligibleBranches: form.eligibleBranches.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create job posting");
        return;
      }
      onSuccess?.();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="bg-muted border-border text-foreground"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field("title", "Job Title", "text", "e.g. SDE Intern")}
        {field("company", "Company Name", "text", "e.g. Google")}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Job Description</label>
        <textarea
          rows={5}
          placeholder="Full job description, requirements, and responsibilities..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-md bg-muted border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary resize-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {field("ctcMin", "Min CTC (₹ LPA)", "number", "e.g. 6")}
        {field("ctcMax", "Max CTC (₹ LPA)", "number", "e.g. 12")}
        {field("minCgpa", "Min CGPA", "number", "e.g. 7.0")}
      </div>
      {field("eligibleBranches", "Eligible Branches", "text", "CSE, IT, ECE")}
      <div className="grid grid-cols-2 gap-4">
        {field("deadline", "Application Deadline", "date")}
        {field("driveDate", "Drive Date (optional)", "date")}
      </div>

      {error && (
        <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || !form.title || !form.company || !form.description || !form.deadline}
        className="w-full gradient-primary text-primary-foreground font-semibold glow-primary"
      >
        {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <>Post Job <ArrowRight className="ml-2 h-4 w-4" /></>}
      </Button>
    </form>
  );
}
