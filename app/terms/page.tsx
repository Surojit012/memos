import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — memos",
  description: "The terms governing your use of memos.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="June 24, 2026"
      intro="These Terms of Service (“Terms”) govern your access to and use of memos, including our website, APIs, and SDKs. By using memos, you agree to these Terms. If you do not agree, do not use the service."
      sections={[
        {
          heading: "Use of the service",
          body: "You may use memos only in compliance with these Terms and all applicable laws. You are responsible for the agents, memories, and content you create, store, or transmit through the service, and for keeping your API keys and wallet credentials secure.",
        },
        {
          heading: "Accounts and access",
          body: "Access to certain features requires wallet-based authentication and API keys. You are responsible for all activity that occurs under your account or keys. Notify us promptly of any unauthorized use.",
        },
        {
          heading: "Acceptable use",
          body: "You agree not to misuse the service, including by attempting to disrupt its infrastructure, reverse-engineer security mechanisms, store unlawful content, or use memos to violate the rights of others.",
        },
        {
          heading: "Decentralized infrastructure",
          body: "memos relies on the 0G decentralized stack for storage, compute, and on-chain anchoring. You acknowledge that data committed to decentralized or on-chain systems may be public and permanent, and that such systems operate independently of us.",
        },
        {
          heading: "Intellectual property",
          body: "memos and its underlying software, branding, and content are owned by us or our licensors. You retain ownership of the data and content you provide, subject to the licenses needed to operate the service.",
        },
        {
          heading: "Disclaimers and limitation of liability",
          body: "The service is provided “as is” without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages, or for loss of data arising from your use of the service or decentralized infrastructure.",
        },
        {
          heading: "Changes to these Terms",
          body: "We may update these Terms from time to time. Continued use of memos after changes take effect constitutes acceptance of the revised Terms.",
        },
        {
          heading: "Contact",
          body: "For questions about these Terms, please reach out through our official channels listed on the memos website.",
        },
      ]}
    />
  );
}
