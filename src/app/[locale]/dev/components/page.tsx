import { Button } from "@/components/ui/Button";
import { TrustIndicator } from "@/components/ui/TrustIndicator";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";
import { SearchExperience, type SearchableItem } from "@/components/ui/SearchExperience";

// Dev-only visual QA surface for the Tier 2 component library — not
// linked from any nav, not part of the product surface (Tier 3
// "no dead UI" applies to real destinations, not internal tooling).
// Mock data only; real content ships with Sprint 3 seed scripts.

const searchItems: SearchableItem[] = [
  {
    id: "1",
    type: "disease",
    title: "Plantar fasciopathy",
    context: "Degenerative overuse condition of the plantar fascia origin",
    href: "#",
    reviewedAt: "2026-01-15",
  },
  {
    id: "2",
    type: "examination_maneuver",
    title: "Windlass test",
    context: "Passive great toe dorsiflexion reproduces heel pain",
    href: "#",
    reviewedAt: "2026-01-15",
  },
  {
    id: "3",
    type: "clinical_pearl",
    title: "Morning first-step pain",
    context: "The single most discriminating history finding for plantar fasciopathy",
    href: "#",
    reviewedAt: "2026-01-15",
  },
  {
    id: "4",
    type: "reference",
    title: "Riddle & Schappert, 2004",
    context: "Volume of ambulatory care visits for plantar fasciitis",
    href: "#",
  },
  {
    id: "5",
    type: "risk_factor",
    title: "Obesity",
    context: "BMI > 30 roughly doubles odds of plantar fasciopathy",
    href: "#",
    reviewedAt: "2025-11-02",
  },
  {
    id: "6",
    type: "procedure",
    title: "Corticosteroid injection, plantar fascia",
    context: "Ultrasound-guided, posteromedial approach",
    href: "#",
    reviewedAt: "2025-11-02",
  },
];

export default function ComponentShowcase() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-16">
      <section className="flex flex-col gap-4">
        <h2 className="font-ui text-sm text-secondary">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Save to workspace</Button>
          <Button variant="secondary">View references</Button>
          <Button variant="ghost">Dismiss</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-ui text-sm text-secondary">Trust indicator</h2>
        <div className="flex flex-wrap items-center gap-4">
          <TrustIndicator reviewedAt="2026-01-15" />
          <span className="font-ui text-sm text-secondary">
            (renders nothing when reviewedAt is null — see Reference card below)
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-ui text-sm text-secondary">Evidence badge</h2>
        <EvidenceBadge
          triggerLabel="Why this test"
          metrics={[
            { label: "Sensitivity", value: "0.99" },
            { label: "Specificity", value: "0.28" },
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-ui text-sm text-secondary">Clinical badges</h2>
        <div className="flex flex-wrap gap-2">
          <ClinicalBadge>First-line</ClinicalBadge>
          <ClinicalBadge>Contributing factor</ClinicalBadge>
          <ClinicalBadge tone="warning">Red flag</ClinicalBadge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-ui text-sm text-secondary">
          Universal Knowledge Object Card — variants
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <KnowledgeObjectCard
            type="disease"
            title="Plantar fasciopathy"
            context="Degenerative overuse condition of the plantar fascia origin"
            href="#"
            reviewedAt="2026-01-15"
          />
          <KnowledgeObjectCard
            type="examination_maneuver"
            title="Windlass test"
            context="Passive great toe dorsiflexion reproduces heel pain"
            href="#"
            reviewedAt="2026-01-15"
          />
          <KnowledgeObjectCard
            type="clinical_pearl"
            title="Morning first-step pain"
            context="The single most discriminating history finding for plantar fasciopathy"
            href="#"
            reviewedAt="2026-01-15"
          />
          <KnowledgeObjectCard
            type="reference"
            title="Riddle & Schappert, 2004"
            context="J Foot Ankle Surg — ambulatory care visit volume"
            href="#"
          />
          <KnowledgeObjectCard
            type="guideline_recommendation"
            title="Conservative treatment before injection"
            context="First-line: stretching + orthoses for 6+ weeks before considering injection"
            href="#"
            reviewedAt="2025-11-02"
          />
          <KnowledgeObjectCard
            type="medical_illustration"
            title="Plantar fascia anatomy, medial view"
            context="Origin at medial calcaneal tubercle"
            href="#"
            reviewedAt="2025-11-02"
            thumbnailUrl="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&h=200&fit=crop"
            thumbnailAlt="Diagram of plantar fascia anatomy, medial view of the foot"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-ui text-sm text-secondary">
          Search experience (mixed-type results, no grouping)
        </h2>
        <SearchExperience items={searchItems} />
      </section>
    </main>
  );
}
