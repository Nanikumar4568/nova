// Smoke test: NOVA must stay a single, self-contained, offline-capable file.
import { readFileSync, statSync } from "node:fs";

const PATH = new URL("../index.html", import.meta.url);
const html = readFileSync(PATH, "utf8");
const bytes = statSync(PATH).size;

const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

// 1. must be a complete document
ok(/^<!doctype html>/i.test(html.trimStart()), "index.html must start with <!doctype html>");
ok(html.includes("</html>"), "index.html must be closed");
ok(html.length > 5000, "index.html looks truncated");

// 2. must not depend on the network
const externalRefs = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+/gi)]
  .map((m) => m[0]);
ok(externalRefs.length === 0, `found external references: ${externalRefs.join(", ")}`);

// 3. one inline script and one inline stylesheet, both non-trivial
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
ok(scripts.length === 1, `expected exactly 1 inline script, found ${scripts.length}`);
ok(scripts.length > 0 && scripts[0][1].length > 8000, "inline script is suspiciously small");

// 4. required DOM anchors
for (const id of ["sky", "phrase", "forge", "readout", "roTitle", "roClass", "roTemp", "roMass", "roWorlds", "roSeed", "dice", "share", "toast"]) {
  ok(html.includes(`id="${id}"`), `missing element #${id}`);
}

// 5. the determinism pipeline must be present
ok(html.includes("fnv1a"), "missing FNV-1a hash");
ok(html.includes("mulberry32"), "missing mulberry32 PRNG");
ok(/CLASSES\s*=\s*\[/.test(html), "missing spectral class table");

// 6. no accidental `Math.random()` in the star derivation path
const randUses = (html.match(/Math\.random\(/g) || []).length;
ok(randUses <= 2, `Math.random() used ${randUses} times — only the dice/labels may use it`);

// 7. size budget
ok(bytes < 250_000, `index.html is ${bytes} bytes — over the 250 KB budget`);

if (failures.length) {
  console.error("✗ smoke test failed:\n" + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}

console.log(`✓ index.html is self-contained (${(bytes / 1024).toFixed(1)} KB), offline-capable, deterministic`);
