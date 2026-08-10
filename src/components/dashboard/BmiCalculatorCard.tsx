"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

function categoryFor(bmi: number): { label: string; className: string } {
  if (bmi < 18.5) return { label: "Underweight", className: "text-card-blue" };
  if (bmi < 25) return { label: "Normal", className: "text-trust" };
  if (bmi < 30) return { label: "Overweight", className: "text-insight" };
  return { label: "Obese", className: "text-warning" };
}

// The one real, functional tile in "My tools" — a standard adult WHO
// BMI formula/category cutoffs, safe to hardcode since it's a single
// uncontroversial global standard, unlike a Pain/ROM/Risk score (each
// of those names a specific clinical instrument this app has no
// verified reference for, so they stay inert "Coming soon" tiles
// rather than a fabricated implementation).
export function BmiCalculatorCard() {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const bmi = w > 0 && h > 0 ? w / (h / 100) ** 2 : null;
  const category = bmi ? categoryFor(bmi) : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-start gap-3 text-left"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-violet/10 text-card-violet">
          <Calculator className="size-5" aria-hidden="true" />
        </span>
        <span className="font-ui text-sm font-medium text-primary">BMI Calculator</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-ui text-xs text-secondary">Weight (kg)</span>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1.5 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-ui text-xs text-secondary">Height (cm)</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1.5 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          </div>
          {bmi && category && (
            <p className="font-ui text-sm text-primary">
              BMI <span className="font-semibold">{bmi.toFixed(1)}</span> —{" "}
              <span className={`font-medium ${category.className}`}>{category.label}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
