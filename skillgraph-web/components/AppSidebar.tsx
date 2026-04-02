"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Briefcase,
  TrendingUp,
  User,
  LogOut,
  Target,
  Bot,
  FileText,
  BarChart2,
  Building2,
  Users,
  FileOutput,
  Building,
  Search,
  Star,
  PlusCircle,
  GitBranch,
} from "lucide-react";
import SkillGraphLogo from "./SkillGraphLogo";

const studentNav = [
  { label: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard },
  { label: 'My Sprint',       path: '/sprint',          icon: Zap },
  { label: 'Skill Gap',       path: '/market',          icon: Target },
  { label: 'OpenClaw Agent',  path: '/openclaw',        icon: Bot },       
  { label: 'Resume Builder',  path: '/resume-builder',  icon: FileText },  
  { label: 'Campus Jobs',     path: '/jobs',            icon: Briefcase }, 
  { label: 'LinkedIn AI',     path: '/linkedin',        icon: User },
  { label: 'Benchmark',       path: '/benchmark',       icon: BarChart2 },
  { label: 'Profile',         path: '/profile',         icon: User },
];

const facultyNav = [
  { label: 'Placement Cell',  path: '/faculty/dashboard',   icon: Building2 },
  { label: 'Job Postings',    path: '/faculty/jobs',         icon: Briefcase },
  { label: 'Applications',    path: '/faculty/applications', icon: Users },
  { label: 'Cohort Analytics',path: '/faculty/analytics',   icon: BarChart3 },
  { label: 'Reports',         path: '/faculty/reports',      icon: FileOutput },
  { label: 'Companies',       path: '/faculty/companies',    icon: Building },
];

const recruiterNav = [
  { label: 'Talent Discovery', path: '/recruiter/talent',    icon: Search },
  { label: 'My Shortlist',     path: '/recruiter/shortlist', icon: Star },
  { label: 'Post a Job',       path: '/recruiter/jobs/new',  icon: PlusCircle },
  { label: 'Pipeline',         path: '/recruiter/pipeline',  icon: GitBranch },
  { label: 'Analytics',        path: '/recruiter/analytics', icon: TrendingUp },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "STUDENT";
  const navItems = role === "FACULTY" ? facultyNav : role === "RECRUITER" ? recruiterNav : studentNav;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 pinstripe-pattern">
      <div className="p-6 border-b border-sidebar-border bg-sidebar/80">
        <SkillGraphLogo />
      </div>

      <nav className="flex-1 p-4 space-y-1 bg-sidebar/60 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-sidebar-accent text-primary glow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar/80">
        <Link
          href="/logout"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
