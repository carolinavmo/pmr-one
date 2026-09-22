# Highlight card — three variants

Reference: `CARDS-VARIANTS.png` · **source of truth**: `cards-variants.html`

One component, three looks. Same types, colours and text — only the edge changes.

```
<HighlightCard type="pearl" variant="hairline | header | framed">…</HighlightCard>
```

## Type tokens
Each type has four colours:

| Type | `--c` label | `--cb` tint | `--cd` border | `--cm` mid tint |
|---|---|---|---|---|
| `pearl` — Clinical pearl | `#8A5F08` | `#FDF6E6` | `#F1E2BF` | `#F7EACB` |
| `flag` — Red flag | `#B8262B` | `#FDF0F0` | `#F4D2D3` | `#F9DFE0` |
| `exam` — Exam tip | `#5A479C` | `#F4F1FB` | `#E0D9F2` | `#E9E3F7` |
| `clinic` — In the clinic | `#1F7A4D` | `#EEF8F2` | `#CDE9D8` | `#DDF0E5` |
| `definition` — Definition | `#14284A` | `#F2F5F9` | `#DCE3EC` | `#E4EAF2` |

## Shared
```css
.hc .label{
  font:900 10.5px/1.2 Roboto, sans-serif;
  letter-spacing:1.4px; text-transform:uppercase;
  color:var(--c); margin-bottom:6px;
}
.hc p{font-size:15.5px; line-height:1.6; color:#27344A}
.hc p b{font-weight:800; color:#14284A}
```

## Variant: `hairline` (S3)
```css
.hc--hairline{
  background:var(--cb);
  border:1px solid var(--cd);
  border-radius:16px;
  padding:15px 20px 16px;
}
```

## Variant: `header` (S7)
```css
.hc--header{background:var(--cb); border-radius:16px; overflow:hidden}
.hc--header .label{
  background:var(--cm);
  margin:0; padding:9px 20px;
}
.hc--header .body{padding:11px 20px 16px}
```
The label moves into the top strip; the text sits in `.body` below it.

## Variant: `framed` (S8)
```css
.hc--framed{background:var(--cm); border-radius:18px; padding:5px}
.hc--framed .inner{background:#fff; border-radius:14px; padding:13px 16px 14px}
```
A 5px tinted frame around a white centre. Outer radius 18, inner 14 — keep the 4px
difference or the corners look uneven.

## Rules for all three
1. **No icons.** The label names the type and is always present, always uppercase.
2. **One bold phrase** per card at most.
3. **Two cards per section** at most, never back to back.
4. **18px** above and below a card within an article.
5. Never use the navigation accent `#0E9BA6` for a card.
