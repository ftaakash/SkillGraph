import Link from "next/link";

/** Explicit consent checkbox required at registration (recorded with the account). */
export default function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        required
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span>
        I agree to the{" "}
        <Link href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>.
      </span>
    </label>
  );
}
