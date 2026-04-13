import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";

const DashboardLayout = ({ children, title }: { children: ReactNode; title: string }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
            <div className="mt-2 h-0.5 w-16 gradient-primary rounded-full" />
          </div>
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
