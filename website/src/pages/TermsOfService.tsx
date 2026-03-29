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

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-24">

        {/* Header */}
        <div className="mb-14">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Terms of Service</h1>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-mono text-muted-foreground">Last updated {LAST_UPDATED}</span>
          </div>
        </div>

        {/* Intro */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-12 pl-9">
          Please read these Terms of Service carefully before using CogniVest. By accessing or using our platform,
          you agree to be bound by these terms. If you do not agree, please do not use the platform.
        </p>

        <Section number="01" title="Acceptance of Terms">
          <p>
            By creating an account or using CogniVest in any capacity — as a client, advisor, or visitor — you agree
            to these Terms of Service and our Privacy Policy. These terms constitute a legally binding agreement
            between you and CogniVest Technologies Pvt. Ltd.
          </p>
          <p>
            We reserve the right to update these terms at any time. Continued use of the platform after changes are
            posted constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section number="02" title="Description of Services">
          <p>
            CogniVest is an AI-powered financial intelligence platform that helps SEBI-registered investment advisors
            build and manage digital financial twins for their clients. The platform generates portfolio analyses,
            goal projections, behavioural profiles, and advisory talking points.
          </p>
          <p>
            CogniVest is a tool for licensed advisors. All advice delivered to clients is the responsibility of the
            registered advisor using the platform. CogniVest does not independently provide regulated investment
            advice.
          </p>
        </Section>

        <Section number="03" title="Eligibility and Accounts">
          <p>
            Advisor accounts are available to SEBI-registered Investment Advisers (RIAs) and AMFI-registered Mutual
            Fund Distributors. By registering as an advisor you represent that you hold the appropriate regulatory
            licence.
          </p>
          <p>
            Client accounts may only be created by or through a registered advisor on the platform. You must be at
            least 18 years of age and a resident or non-resident Indian to use the platform as a client.
          </p>
          <p>
            You are responsible for maintaining the security of your account credentials. Notify us immediately at
            support@cognivest.app if you suspect unauthorised access.
          </p>
        </Section>

        <Section number="04" title="AI-Generated Content Disclaimer">
          <p>
            CogniVest uses large language models and quantitative simulation engines to generate portfolio analyses,
            goal projections, and behavioural insights. This output is generated algorithmically and may contain
            errors or inaccuracies.
          </p>
          <p>
            AI-generated content on this platform is intended to assist licensed advisors in preparing advice — it
            is not a substitute for professional judgement. Advisors must independently verify all AI output before
            presenting it to clients.
          </p>
        </Section>

        <Section number="05" title="Investment Disclaimer">
          <p>
            Nothing on CogniVest constitutes investment advice, a solicitation to buy or sell any security, or a
            guarantee of future returns. All projections, simulations, and goal analyses are illustrative and based
            on assumptions that may not reflect actual market conditions.
          </p>
          <p>
            Past performance and model outputs do not guarantee future results. Investments in securities market are
            subject to market risks. Please read all scheme-related documents carefully.
          </p>
          <p>
            CogniVest is registered under the provisions of the Companies Act, 2013 and is not a SEBI-registered
            entity providing investment advisory services directly to investors.
          </p>
        </Section>

        <Section number="06" title="Financial Data and Consent">
          <p>
            The platform collects sensitive financial and personal information including income, asset holdings, tax
            profile, and behavioural assessments. This data is collected only with explicit client consent, recorded
            at the time of onboarding.
          </p>
          <p>
            Client data is used exclusively to power the digital twin engine and generate advisory outputs for the
            client's registered advisor. Data is never sold to third parties or used for advertising.
          </p>
        </Section>

        <Section number="07" title="Prohibited Use">
          <p>You agree not to:</p>
          <ul className="list-none space-y-1.5 mt-2">
            {[
              "Use the platform to provide advice without holding the required regulatory licence",
              "Misrepresent AI-generated output to clients as human-authored advice",
              "Attempt to reverse-engineer, scrape, or extract data from the platform",
              "Share your account credentials or allow unauthorised users to access the platform",
              "Use the platform for any unlawful purpose under Indian law or applicable foreign law",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-1">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section number="08" title="Intellectual Property">
          <p>
            All software, design, algorithms, models, and content on the CogniVest platform are the property of
            CogniVest Technologies Pvt. Ltd. and are protected by applicable intellectual property laws.
          </p>
          <p>
            Your client data and any content you upload remains your property. You grant CogniVest a limited licence
            to process this data solely to provide the services described in these terms.
          </p>
        </Section>

        <Section number="09" title="Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, CogniVest shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the platform, including investment
            losses, loss of data, or reliance on AI-generated output.
          </p>
          <p>
            Our total liability for any claim arising from use of the platform shall not exceed the fees paid by
            you in the 12 months preceding the claim.
          </p>
        </Section>

        <Section number="10" title="Termination">
          <p>
            We may suspend or terminate your account if you violate these terms, your regulatory licence lapses, or
            we determine that continued access poses risk to other users or to the platform.
          </p>
          <p>
            Upon termination, your data will be retained for the period required by applicable Indian financial
            regulations (typically 5 years) and then deleted in accordance with our data retention policy.
          </p>
        </Section>

        <Section number="11" title="Governing Law">
          <p>
            These terms are governed by and construed in accordance with the laws of India. Any disputes arising
            shall be subject to the exclusive jurisdiction of courts in Bangalore, Karnataka.
          </p>
        </Section>

        <Section number="12" title="Contact">
          <p>
            For questions about these terms, please contact us at{" "}
            <a href="mailto:legal@cognivest.app" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
              legal@cognivest.app
            </a>
            .
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
