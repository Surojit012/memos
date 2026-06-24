import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — memos",
  description: "How memos collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 24, 2026"
      intro="This Privacy Policy explains how memos (“we”, “us”) collects, uses, and protects information when you use our website, APIs, and SDKs. By using memos, you agree to the practices described here."
      sections={[
        {
          heading: "Information we collect",
          body: "We collect account information you provide (such as wallet address and email), agent and memory data you store through our APIs, and technical data such as IP address, browser type, and usage logs generated when you interact with our services.",
        },
        {
          heading: "How we use information",
          body: "We use collected information to operate and improve memos, authenticate requests, provide persistent memory for your agents, communicate with you about the service, and maintain the security and integrity of our infrastructure.",
        },
        {
          heading: "Decentralized storage",
          body: "memos is built on the 0G decentralized stack. Memory manifests and related data may be stored on 0G Storage and anchored on-chain. Data written to decentralized or on-chain systems may be public and is generally not deletable. Do not store sensitive personal data unencrypted.",
        },
        {
          heading: "Data sharing",
          body: "We do not sell your personal information. We may share data with infrastructure and service providers strictly to operate memos, or when required by law.",
        },
        {
          heading: "Data retention",
          body: "We retain information for as long as your account is active or as needed to provide the service. Data committed to decentralized storage or on-chain registries may persist independently of our systems.",
        },
        {
          heading: "Your rights",
          body: "Depending on your jurisdiction, you may have rights to access, correct, or delete personal data we control. Contact us to exercise these rights, noting the limitations that apply to decentralized and on-chain data.",
        },
        {
          heading: "Contact",
          body: "For questions about this Privacy Policy or our data practices, please reach out through our official channels listed on the memos website.",
        },
      ]}
    />
  );
}
