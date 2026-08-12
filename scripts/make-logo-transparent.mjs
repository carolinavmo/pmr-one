// One-off: the source PNG (public/brand-logo.png) has no alpha channel —
// its "transparent" background is actually flat near-white pixels baked
// in as opaque RGB. This flood-fills the background region (starting
// from the image border, following connected near-white/gray pixels
// only — so internal white highlight strokes on the brain, which aren't
// connected to the border, are left untouched) and cuts it to real
// alpha=0 transparency, then feathers the alpha channel slightly so the
// cutout edge isn't jagged.
import sharp from "sharp";

const SRC = "public/brand-logo.png";

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info; // channels === 4 (RGBA) after ensureAlpha

function isBackground(idx) {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min > 220 && max - min < 20;
}

const mask = new Uint8Array(width * height); // 1 = background
const stack = [];

for (let x = 0; x < width; x++) {
  for (const y of [0, height - 1]) {
    const p = y * width + x;
    if (!mask[p] && isBackground(p * channels)) {
      mask[p] = 1;
      stack.push(p);
    }
  }
}
for (let y = 0; y < height; y++) {
  for (const x of [0, width - 1]) {
    const p = y * width + x;
    if (!mask[p] && isBackground(p * channels)) {
      mask[p] = 1;
      stack.push(p);
    }
  }
}

while (stack.length > 0) {
  const p = stack.pop();
  const x = p % width;
  const y = (p - x) / width;
  const neighbors = [];
  if (x > 0) neighbors.push(p - 1);
  if (x < width - 1) neighbors.push(p + 1);
  if (y > 0) neighbors.push(p - width);
  if (y < height - 1) neighbors.push(p + width);
  for (const n of neighbors) {
    if (!mask[n] && isBackground(n * channels)) {
      mask[n] = 1;
      stack.push(n);
    }
  }
}

for (let p = 0; p < width * height; p++) {
  if (mask[p]) data[p * channels + 3] = 0;
}

const cut = sharp(data, { raw: { width, height, channels } });

// Feather just the alpha channel a little so the flood-fill boundary
// (which is pixel-hard) doesn't look jagged against a dark page background.
const alpha = await cut.clone().extractChannel(3).blur(1).raw().toBuffer();
const rgb = await cut.clone().removeAlpha().raw().toBuffer();

await sharp(rgb, { raw: { width, height, channels: 3 } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } })
  .png()
  .toFile("public/brand-logo.png");

console.log("Done — background cut to real transparency.");
