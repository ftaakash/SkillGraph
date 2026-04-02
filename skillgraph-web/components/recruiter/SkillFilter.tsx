"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SkillFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  branches: string[];
  selectedBranch: string;
  onBranchChange: (val: string) => void;
}

export default function SkillFilter({ search, onSearchChange, branches, selectedBranch, onBranchChange }: SkillFilterProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
        <Input
          placeholder="Search by name, skill, or role..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-muted border-border text-foreground text-sm"
        />
      </div>
      <select
        value={selectedBranch}
        onChange={(e) => onBranchChange(e.target.value)}
        className="bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground cursor-pointer"
      >
        <option value="">All Branches</option>
        {branches.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
  );
}
