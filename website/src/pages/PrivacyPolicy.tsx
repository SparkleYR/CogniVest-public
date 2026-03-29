import React from "react";

const LAST_UPDATED = "29 March 2026";

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-mono text-muted-foreground w-6 flex-shrink-0">{number}</span>
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="pl-9 text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-24">

        {/* Header */}
        <div className="mb-14">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Privacy Policy</h1>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-mono text-muted-foreground">Last updated {LAST_UPDATED}</span>
          </div>
        </div>

        {/* Intro */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-12 pl-9">
          CogniVest takes data privacy seriously. This policy explains what information we collect, how we use it,
          and your rights with respect to your data. Because we handle sensitive financial information, we apply
          strict controls that exceed standard industry practice.
        </p>

        <Section number="01" title="Information We Collect">
          <p>We collect the following categories of data:</p>
          <ul className="list-none space-y-1.5 mt-2">
            {[
              { label: "Identity data", desc: "Name, age, city, occupation, marital status" },
              { label: "Financial data", desc: "Income, expenses, surplus, existing portfolio, loans, goals" },
              { label: "Tax profile", desc: "Tax bracket, regime, deductions, capital gains" },
              { label: "Insurance data", desc: "Cover amounts, policy types, premiums" },
              { label: "Behavioural data", desc: "Risk tolerance, loss aversion, past investment behaviour, key quotes from onboarding" },
              { label: "Usage data", desc: "Pages visited, features used, session duration — to improve the product" },
              { label: "Device data", desc: "Browser type, operating system, IP address (for security only)" },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-1">—</span>
                <span><span className="text-foreground font-medium">{item.label}:</span> {item.desc}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section number="02" title="How We Use Your Information">
          <p>Your data is used solely to provide and improve the CogniVest platform. Specifically:</p>
          <ul className="list-none space-y-1.5 mt-2">
            {[
              "Generate your digital financial twin and portfolio analysis",
              "Run behavioural simulations and goal projections",
              "Produce advisory output for your registered advisor",
              "Improve our AI models using anonymised, aggregated patterns",
              "Comply with applicable Indian financial regulations",
              "Send service communications (not marketing) related to your account",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-1">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            We do not sell your personal or financial data to any third party. We do not use your data for
            advertising or profiling outside of the advisory context.
          </p>
        </Section>

        <Section number="03" title="Financial Data Handling">
          <p>
            Financial data is particularly sensitive and is subject to enhanced protections. All financial data
            is encrypted at rest using AES-256 and in transit using TLS 1.3. Database access is restricted to
            authenticated service roles only.
          </p>
          <p>
            Your financial data is only accessible to: (a) the AI engine that generates your twin, (b) your
            registered advisor on the platform, and (c) CogniVest engineering staff with strict audit logging
            for compliance purposes.
          </p>
          <p>
            Behavioural vectors extracted from your onboarding conversation are stored separately in a vector
            database used solely for semantic similarity and personalisation within your advisor's account.
          </p>
        </Section>

        <Section number="04" title="Data Storage and Security">
          <p>
            Your data is stored on Supabase (PostgreSQL), hosted on AWS infrastructure in the ap-south-1
            (Mumbai) region, keeping your data within Indian jurisdiction.
          </p>
          <p>
            We implement industry-standard security measures including row-level security policies, encrypted
            backups, access logging, and regular security audits. No system is completely secure; in the event
            of a breach, we will notify affected users within 72 hours.
          </p>
        </Section>

        <Section number="05" title="Third-Party Services">
          <p>We use the following third-party services to operate the platform:</p>
          <ul className="list-none space-y-1.5 mt-2">
            {[
              { name: "Supabase", use: "Database and authentication (AWS Mumbai)" },
              { name: "OpenRouter / AI providers", use: "LLM inference for chat and data extraction — data is not retained by AI providers per our agreements" },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-1">—</span>
                <span><span className="text-foreground font-medium">{item.name}:</span> {item.use}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            We do not integrate with third-party brokers, banks, or data aggregators without explicit user consent.
          </p>
        </Section>

        <Section number="06" title="Cookies and Tracking">
          <p>
            We use strictly necessary cookies for session management and authentication. We do not use
            third-party advertising cookies or tracking pixels.
          </p>
          <p>
            We use anonymous analytics to understand how features are used. No personally identifiable information
            is included in analytics data.
          </p>
        </Section>

        <Section number="07" title="Data Retention">
          <p>
            Client financial data is retained for the period required by applicable Indian financial regulations
            (SEBI, PMLA) — typically 5 years from the last transaction or advisory interaction.
          </p>
          <p>
            If you close your account, your data is archived (not deleted) for the regulatory retention period
            and then permanently deleted. Anonymised, aggregated data derived from your account may be retained
            indefinitely for model improvement purposes.
          </p>
        </Section>

        <Section number="08" title="Your Rights">
          <p>Under applicable Indian law and our data practices, you have the right to:</p>
          <ul className="list-none space-y-1.5 mt-2">
            {[
              "Access the personal data we hold about you",
              "Request correction of inaccurate data",
              "Request deletion of your data (subject to regulatory retention requirements)",
              "Withdraw consent for data processing (which will result in account closure)",
              "Receive a copy of your data in a portable format",
              "Raise a complaint with the relevant regulatory authority",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-1">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:privacy@cognivest.app" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
              privacy@cognivest.app
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section number="09" title="Children's Privacy">
          <p>
            CogniVest is not intended for use by individuals under 18 years of age. We do not knowingly collect
            personal data from minors. If you believe a minor has created an account, please contact us immediately.
          </p>
        </Section>

        <Section number="10" title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by email
            or via an in-platform notice at least 14 days before the changes take effect.
          </p>
        </Section>

        <Section number="11" title="Contact">
          <p>
            For privacy-related queries, data requests, or concerns, contact our Data Protection Officer at{" "}
            <a href="mailto:privacy@cognivest.app" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
              privacy@cognivest.app
            </a>
            .
          </p>
          <p>
            CogniVest Technologies Pvt. Ltd.<br />
            Bangalore, Karnataka, India
          </p>
        </Section>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs font-mono text-muted-foreground text-center">
            CogniVest Technologies Pvt. Ltd. · Bangalore, India · © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
