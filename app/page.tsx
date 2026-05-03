import { Navbar } from '@/components/memoryos/Navbar'
import { HeroSection } from '@/components/memoryos/HeroSection'
import { FeatureBento } from '@/components/memoryos/FeatureBento'
import { ProductGrid } from '@/components/memoryos/ProductGrid'
import { TestimonialMarquee } from '@/components/memoryos/TestimonialMarquee'
import { DeveloperShowcase } from '@/components/memoryos/DeveloperShowcase'
import { CTABanner } from '@/components/memoryos/CTABanner'
import { NewsletterCapture } from '@/components/memoryos/NewsletterCapture'
import { Footer } from '@/components/memoryos/Footer'

export const metadata = {
  title: 'MemoryOS | The Operating System for Autonomous AI Agents on 0G',
  description: 'Permanent memory, cognitive intelligence, encrypted vaults, cross-agent sharing, ERC-7857 Brain INFTs, and a skills marketplace — all powered exclusively by 0G Network. 30 distinct 0G use cases across Storage, Compute, and Chain. No AWS. No Pinecone. Pure 0G.',
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden selection:bg-[#5E7D7E] selection:text-[#F4F1EE]">
      <Navbar />
      <HeroSection />
      <FeatureBento />
      <ProductGrid />
      <TestimonialMarquee />
      <DeveloperShowcase />
      <CTABanner />
      <NewsletterCapture />
      <Footer />
    </main>
  )
}
