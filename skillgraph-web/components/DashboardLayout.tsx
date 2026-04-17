import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";

const DashboardLayout = ({ children, title }: { children: ReactNode; title: string }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border/40 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            <div className="mt-1 h-0.5 w-12 gradient-primary rounded-full" />
          </div>
          <NotificationBell />
        </header>
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
};


export default DashboardLayout;
