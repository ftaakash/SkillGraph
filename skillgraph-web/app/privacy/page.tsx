import type { Metadata } from "next";
import LegalPage, { CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — SkillGraph" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        SkillGraph helps students understand skill gaps, learn, and prepare job applications, and helps placement cells and
        recruiters find opted-in talent. This policy explains what we collect, why, who processes it, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong>: name, email, password (stored only as a salted hash), role, and the date and version of the terms you accepted.</li>
        <li><strong>Profile data you provide</strong>: college, branch, year, CGPA, target role, LinkedIn/GitHub links, and OpenClaw preferences such as target roles, cities, application email and phone number.</li>
        <li><strong>Résumé data</strong>: the PDF you upload and the skills, projects and education extracted from it; tailored résumés generated for job applications.</li>
        <li><strong>Academic data</strong> (only if you or your college provide it): attendance, marks, timetable, academic calendar and your register number, from your university once you connect it, or imported by your college&apos;s placement cell. If you connect by signing in to your university portal, your university password is used once to sign in and is never stored; we keep only the encrypted portal session, which you can remove by disconnecting.</li>
        <li><strong>Activity data</strong>: skill gaps, learning sprints, job evaluations, applications you track, interview stories, notifications, and AI usage counts used to enforce fair-use limits.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the service: gap analysis, sprints, project ideas, résumé tailoring and job-fit evaluation.</li>
        <li>To secure accounts: email verification, password resets, rate limiting and abuse prevention.</li>
        <li>To show placement cells aggregate, cohort-level statistics, and to produce anonymous benchmarks that contain no user identifier.</li>
      </ul>
      <p>We do not sell personal data and do not use it for advertising.</p>

      <h2>Recruiters and your identity</h2>
      <p>
        Recruiters only see students who turn on <em>Visible to Recruiters</em>, and only an anonymous profile (skills, readiness score,
        target role, year). A recruiter can ask to see your name and contact details; nothing is shared unless you accept that specific
        request, and you can revoke an acceptance at any time from your profile.
      </p>

      <h2>Your university and your placement cell</h2>
      <p>
        Attendance and marks you connect or that your college imports are visible to you and to the faculty of the college workspace you
        joined. Placement drives your college imports may link to its placement portal; you apply there yourself.
      </p>

      <h2>OpenClaw and job sites</h2>
      <p>
        OpenClaw never logs into job boards on your behalf and never stores your credentials or cookies for third-party sites. It reads
        public job listings from official APIs and licensed job-data providers, and prepares a résumé tailored to each job from your own résumé.
      </p>
      <p>
        If you turn on <em>Submit for me where the employer allows it</em>, OpenClaw sends your name, contact details, LinkedIn/GitHub links,
        college and tailored résumé to the hiring system of an employer that has connected it to SkillGraph, for jobs that pass your filters.
        It is off by default and you can turn it off at any time. Every other application is submitted by you.
      </p>
      <p>
        The optional browser extension runs in your own browser on LinkedIn, Naukri, Glassdoor and Superset. It sends the job you are viewing
        (title, company, location, pay and description) to SkillGraph to check your filters and tailor your résumé, then fills the application
        form on that page. It does not read or send your passwords, cookies or messages on those sites, and it never submits a form for you.
        Its access token expires after 30 days and stops working as soon as you disconnect it.
      </p>

      <h2>Service providers</h2>
      <p>We share data only with providers that process it on our behalf to run SkillGraph:</p>
      <ul>
        <li><strong>Hosting and database</strong> (application hosting and managed PostgreSQL).</li>
        <li><strong>AI model provider</strong>: résumé text, skills and job descriptions are sent to an LLM API to generate analyses. Requests are not used by SkillGraph to build profiles beyond the features described here.</li>
        <li><strong>File storage</strong>: résumés are stored privately and served only through short-lived signed links.</li>
        <li><strong>Email delivery</strong>: verification, password-reset and notification emails.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        We keep your data while your account is active. When you delete your account we permanently delete your profile, résumés and
        stored files, applications, sprints, stories and related records. Anonymous benchmarks that cannot identify you are retained.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><strong>Access and portability</strong>: download all your data as JSON from <em>Profile → Privacy &amp; data</em>.</li>
        <li><strong>Correction</strong>: edit your profile at any time.</li>
        <li><strong>Erasure</strong>: delete your account from <em>Profile → Privacy &amp; data</em>.</li>
        <li><strong>Withdraw consent</strong>: turn off recruiter visibility, revoke identity reveals, or pause OpenClaw.</li>
      </ul>
      <p>
        For any privacy request or grievance, contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to respond within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed with bcrypt, sessions end when you change your password, files are private, traffic is encrypted in transit,
        and access to user data is restricted by role.
      </p>

      <h2>Changes</h2>
      <p>If we materially change this policy we will update the version above and ask you to review it.</p>
    </LegalPage>
  );
}
