"use client";

import { useRef, useState } from "react";
import {
  Plus,
  X,
  Upload,
  Trash2,
  PersonStanding,
  Contrast,
} from "lucide-react";
import { useEditMode } from "@/components/disease-page/EditMode";
import { EditableText } from "@/components/ui/EditableText";
import { LinkButton } from "@/components/ui/LinkButton";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { CARD_COLOR_ORDER, CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { TEXT_COLOR_CLASS } from "@/lib/rich-text";
import type { CardColor } from "@/lib/editorial-blocks";
import type { DashboardHero, DashboardHeroCard } from "@/lib/dashboard-hero";
import {
  updateDashboardHeroTextAction,
  updateDashboardHeroCardsAction,
  updateDashboardHeroScrimAction,
  uploadDashboardHeroBackgroundAction,
  removeDashboardHeroBackgroundAction,
} from "@/lib/actions/dashboard-hero";

// Same light-tint treatment as IconListBlock's local ICON_BG_CLASS —
// duplicated rather than shared, matching this codebase's existing
// pattern of each block/section owning its own small color-class map.
const ICON_BG_CLASS: Record<CardColor, string> = {
  neutral: "bg-border/60",
  accent: "bg-accent/10",
  trust: "bg-trust/10",
  insight: "bg-insight/10",
  blue: "bg-card-blue/10",
  violet: "bg-card-violet/10",
  rose: "bg-card-rose/10",
  slate: "bg-card-slate/10",
};

function isCardIconName(value: string | null): value is CardIconName {
  return value !== null && value in cardIcons;
}

// The signed-in dashboard's hero band — fully editor/admin-authored
// (headline, subtitle, stat cards, background image), same
// requireEditor() gate disease content already uses. Not editing (no
// Provider above, or the toggle is off): renders exactly the same
// markup a visitor with no edit affordances would ever see.
export function DashboardHeroSection({ hero }: { hero: DashboardHero }) {
  const { editing } = useEditMode();
  const [cards, setCards] = useState(hero.cards);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [scrimEnabled, setScrimEnabled] = useState(hero.backgroundScrim);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commitCards = (next: DashboardHeroCard[]) => {
    setCards(next);
    updateDashboardHeroCardsAction(next);
  };

  const toggleScrim = () => {
    const next = !scrimEnabled;
    setScrimEnabled(next);
    updateDashboardHeroScrimAction(next);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadDashboardHeroBackgroundAction(formData);
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-border bg-surface-raised p-6 shadow-sm lg:flex-row lg:items-center lg:gap-10">
      {hero.backgroundImageUrl && (
        <>
          {/* CSS background, not an <img> — purely decorative, so no alt text is needed. */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${hero.backgroundImageUrl})` }}
            aria-hidden="true"
          />
          {/* A scrim in the page's own surface-raised color, not a fixed
              black/white — it adapts to light/dark automatically and
              guarantees the text column stays legible regardless of
              what an admin uploads, rather than trusting the image's
              own contrast. Admin-toggleable (below) for the images
              that don't need it — a plain color photo with no
              busy detail behind the text column, say. */}
          {scrimEnabled && (
            <div className="absolute inset-0 bg-gradient-to-r from-surface-raised via-surface-raised/90 to-surface-raised/30" />
          )}
        </>
      )}

      <div className="relative flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <EditableText
            as="h2"
            value={hero.headline}
            onSave={(v) => updateDashboardHeroTextAction("headline", v)}
            className="font-heading text-2xl leading-tight font-semibold whitespace-pre-line text-primary sm:text-3xl"
          />
          <EditableText
            as="p"
            value={hero.subtitle}
            onSave={(v) => updateDashboardHeroTextAction("subtitle", v)}
            className="max-w-md font-ui text-sm text-secondary"
          />
        </div>
        <div>
          <LinkButton href="/conditions" variant="primary">
            Browse Conditions
          </LinkButton>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {cards.map((card, index) => (
            <HeroStatCard
              key={index}
              card={card}
              editing={editing}
              onChange={(next) =>
                setCards((current) =>
                  current.map((c, i) => (i === index ? next : c)),
                )
              }
              onCommit={() => commitCards(cards)}
              onRemove={() => commitCards(cards.filter((_, i) => i !== index))}
            />
          ))}
          {editing && (
            <button
              type="button"
              onClick={() =>
                commitCards([
                  ...cards,
                  { label: "", value: "", icon: null, color: "accent" },
                ])
              }
              className="flex h-[60px] items-center gap-1.5 self-stretch rounded-xl border border-dashed border-border px-3 font-ui text-xs text-secondary hover:border-accent hover:text-accent"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Card
            </button>
          )}
        </div>
      </div>

      <div className="relative hidden shrink-0 items-center justify-center lg:flex lg:size-56">
        {/* Decorative brand medallion — the fallback when no admin-
            uploaded background image exists yet. */}
        {!hero.backgroundImageUrl && (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/20 via-card-violet/10 to-transparent" />
            <span className="relative flex size-32 items-center justify-center rounded-full bg-accent text-white shadow-lg">
              <PersonStanding className="size-16" aria-hidden="true" />
            </span>
          </>
        )}
        {editing && (
          <div className="absolute bottom-2 z-10 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-ui text-xs text-primary shadow-sm hover:bg-border/40 disabled:opacity-50"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              {uploading
                ? "Uploading…"
                : hero.backgroundImageUrl
                  ? "Replace"
                  : "Upload image"}
            </button>
            {uploadError && (
              <span className="flex items-center rounded-full bg-surface px-2 font-ui text-xs text-warning shadow-sm">
                {uploadError}
              </span>
            )}
            {hero.backgroundImageUrl && (
              <button
                type="button"
                onClick={toggleScrim}
                aria-pressed={scrimEnabled}
                title={
                  scrimEnabled
                    ? "Remove legibility gradient"
                    : "Add legibility gradient"
                }
                className={`flex items-center justify-center rounded-full border p-1.5 shadow-sm ${
                  scrimEnabled
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-surface text-secondary hover:bg-border/40"
                }`}
              >
                <Contrast className="size-3.5" aria-hidden="true" />
              </button>
            )}
            {hero.backgroundImageUrl && (
              <button
                type="button"
                onClick={() => removeDashboardHeroBackgroundAction()}
                aria-label="Remove background image"
                className="flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-secondary shadow-sm hover:bg-warning/10 hover:text-warning"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStatCard({
  card,
  editing,
  onChange,
  onCommit,
  onRemove,
}: {
  card: DashboardHeroCard;
  editing: boolean;
  onChange: (card: DashboardHeroCard) => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  const Icon = isCardIconName(card.icon) ? cardIcons[card.icon] : null;

  if (!editing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${ICON_BG_CLASS[card.color]}`}
        >
          {Icon && (
            <Icon
              className={`size-4.5 ${TEXT_COLOR_CLASS[card.color]}`}
              aria-hidden="true"
            />
          )}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-reading text-lg text-primary">
            {card.value}
          </span>
          <span className="font-ui text-xs whitespace-nowrap text-secondary">
            {card.label}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-surface px-3 py-2">
      <CardIconPickerButton
        icon={card.icon}
        color={card.color}
        onPickIcon={(icon) => {
          onChange({ ...card, icon });
          onCommit();
        }}
        onPickColor={(color) => {
          onChange({ ...card, color });
          onCommit();
        }}
      />
      <div className="flex flex-col gap-1">
        <input
          value={card.value}
          placeholder="Value"
          onChange={(e) => onChange({ ...card, value: e.target.value })}
          onBlur={onCommit}
          className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 font-reading text-lg text-primary outline-none hover:border-border focus:border-accent"
        />
        <input
          value={card.label}
          placeholder="Label"
          onChange={(e) => onChange({ ...card, label: e.target.value })}
          onBlur={onCommit}
          className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 font-ui text-xs text-secondary outline-none hover:border-border focus:border-accent"
        />
      </div>
      <button
        type="button"
        aria-label="Remove card"
        onClick={onRemove}
        className="self-start text-secondary hover:text-warning"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function CardIconPickerButton({
  icon,
  color,
  onPickIcon,
  onPickColor,
}: {
  icon: CardIconName | null;
  color: CardColor;
  onPickIcon: (icon: CardIconName | null) => void;
  onPickColor: (color: CardColor) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = isCardIconName(icon) ? cardIcons[icon] : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Card icon and color"
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${ICON_BG_CLASS[color]}`}
      >
        {Icon ? (
          <Icon
            className={`size-4.5 ${TEXT_COLOR_CLASS[color]}`}
            aria-hidden="true"
          />
        ) : (
          <span
            className={`size-1.5 rounded-full ${TEXT_COLOR_CLASS[color]} bg-current`}
          />
        )}
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-20 flex w-52 flex-col gap-2 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
          <div className="grid grid-cols-8 gap-1">
            {CARD_COLOR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => onPickColor(c)}
                className={`size-5 rounded-full ring-1 ring-border ${CARD_COLOR_SWATCH[c]} ${
                  c === color ? "ring-2 ring-accent" : ""
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1 border-t border-border pt-2">
            <button
              type="button"
              title="No icon"
              onClick={() => {
                setOpen(false);
                onPickIcon(null);
              }}
              className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
            >
              <span className="size-1.5 rounded-full bg-current" />
            </button>
            {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
              const OptionIcon = cardIcons[name];
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    setOpen(false);
                    onPickIcon(name);
                  }}
                  className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
                >
                  <OptionIcon className="size-3.5" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
