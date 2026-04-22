"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SkillGraphLogo from "@/components/SkillGraphLogo";
import NetworkBackground from "@/components/NetworkBackground";
import PageTransition from "@/components/PageTransition";
import Link from "next/link";

export default function LogoutPage() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative flex items-center justify-center pinstripe-pattern">
        <NetworkBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm p-8"
        >
          <div className="bg-card border border-border rounded-lg p-8 backdrop-blur-sm shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <SkillGraphLogo className="scale-100" />
            </div>

            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <LogOut className="text-destructive" size={28} />
            </div>

            <h1 className="font-heading text-xl font-bold text-foreground mb-2">
              Closing Time?
            </h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              You&apos;re about to leave the trading floor.<br />
              Your progress is saved — you can return anytime.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin mr-2" />
                ) : (
                  <LogOut className="mr-2" size={16} />
                )}
                Yes, Sign Me Out
              </Button>

              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="mr-2" size={16} />
                  Stay on the Floor
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground/60">
              Fortune favors the prepared.
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
