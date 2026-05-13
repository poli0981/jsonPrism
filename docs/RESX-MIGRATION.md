# Migrating i18next JSON to .NET RESX

This guide walks you through converting i18next-style locale files (used by JSONPrism's frontend, YTDescGen, the F2P Tracker, and most React projects) into .NET RESX resource files (used by AutoClickForge, PhantomMAC, and other WPF / Avalonia / WinForms projects).

It's the canonical workflow for keeping a single source-of-truth translation across your web and desktop projects.

---

## The problem

Most JS/TS projects ship translations as namespaced JSON:

```json
{
  "app": {
    "name": "PhantomMAC",
    "tagline": "Randomize your MAC address"
  },
  "buttons": {
    "ok": "OK",
    "cancel": "Cancel"
  }
}
```

.NET projects expect RESX:

```xml
<data name="app.name" xml:space="preserve">
  <value>PhantomMAC</value>
</data>
<data name="buttons.ok" xml:space="preserve">
  <value>OK</value>
</data>
```

Two mismatches:

1. **Shape**: i18next allows arbitrary nesting; RESX requires a flat string-to-string map.
2. **Key convention**: web typically uses `dot.separated.paths` already; native .NET sometimes uses `PascalCase`. JSONPrism doesn't impose either — preserve whatever you have.

---

## Step 1 — Flatten nested JSON

JSONPrism's RESX converter rejects nested objects by design (RESX has no concept of nesting). You need a flat object first.

If your translations are nested, flatten them with a one-liner. Save this as `flatten.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }
  return out;
}

const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
writeFileSync(process.argv[3], JSON.stringify(flatten(input), null, 2));
console.log(`Flattened to ${process.argv[3]}`);
```

Run it:

```bash
node flatten.mjs strings.en.json strings.en.flat.json
node flatten.mjs strings.vi.json strings.vi.flat.json
```

You now have flat objects like:

```json
{
  "app.name": "PhantomMAC",
  "app.tagline": "Randomize your MAC address",
  "buttons.ok": "OK",
  "buttons.cancel": "Cancel"
}
```

---

## Step 2 — Convert to RESX with JSONPrism

### Option A — Single file via the web UI

1. Open JSONPrism (web or desktop)
2. Drop or paste `strings.en.flat.json` into the input panel
3. The format picker highlights **RESX** (a flat object is its native shape)
4. Click **RESX**
5. (Optional) Open the settings panel — enable **Sort entries alphabetically** if you want stable diffs
6. Click **Download** → you get `output.resx`
7. Rename to match your .NET project convention, e.g. `Strings.resx` or `Resources.resx`

### Option B — Batch convert all locales at once

1. Drop **all** your flattened locale files into the input area at the same time (2+ files automatically open the batch panel)
2. Pick **RESX** in the format picker
3. Click **Process** in the batch panel
4. Click **Download .zip**

The output zip contains one `.resx` per input file, with the locale segment preserved:

```
strings.en.flat.json  →  strings.en.flat.resx
strings.vi.flat.json  →  strings.vi.flat.resx
strings.ja.flat.json  →  strings.ja.flat.resx
```

Rename to the .NET convention `Resources.en.resx`, `Resources.vi.resx`, etc. before dropping into your project.

---

## Step 3 — Verify in Visual Studio

1. Drop the generated `.resx` into your .NET project's resources folder
2. Open in Visual Studio — the .resx editor should display every key/value as a flat table
3. Build the project — if VS regenerates a `Resources.Designer.cs` automatically, you'll have strongly-typed access:

   ```csharp
   var greeting = Resources.app_name; // "PhantomMAC"
   ```

   The default tooling replaces `.` with `_` in the property name.

4. Round-trip check: save the file from Visual Studio's editor; the diff against JSONPrism's output should be minimal (whitespace at most). If you see structural diffs, file an issue with the input JSON.

---

## Adding comments

If your translators need context, use the `{ value, _comment }` shape:

```json
{
  "app.name": "PhantomMAC",
  "buttons.ok": { "value": "OK", "_comment": "Confirmation dialog primary action" }
}
```

JSONPrism emits both `<value>` and `<comment>` elements. The comment column shows up in Visual Studio's .resx editor and is preserved through `ResXResourceWriter`.

Change the comment key in the settings panel if your convention is different (e.g. `note`, `description`).

---

## Round-trip safety notes

- **Special characters**: `&`, `<`, `>` are XML-escaped automatically in values; `"` is also escaped in `name=` attributes. You don't need to pre-escape.
- **Whitespace**: `<data>` elements get `xml:space="preserve"`, so leading/trailing spaces in values survive.
- **Empty values**: `null` and `undefined` in JSON become empty `<value></value>` elements.
- **Numbers and booleans**: coerced to their string representation (`true`, `false`, `42`). If you want explicit nullability, wrap in a string in your source JSON.
- **Schema header**: JSONPrism emits the standard RESX 2.0 schema. Visual Studio expects this — leave the **Include xsd:schema header** option on unless you're diffing manually.

---

## Reverse direction (RESX → JSON)

JSONPrism doesn't do this — it's a one-way "JSON → many formats" tool. If you need RESX → JSON for round-tripping, the simplest path is a small .NET console app using `ResXResourceReader`:

```csharp
using System.Resources;
using System.Text.Json;

var dict = new Dictionary<string, string>();
using var reader = new ResXResourceReader("Resources.en.resx");
foreach (System.Collections.DictionaryEntry entry in reader)
{
    dict[(string)entry.Key] = entry.Value?.ToString() ?? "";
}
File.WriteAllText("strings.en.flat.json", JsonSerializer.Serialize(dict, new JsonSerializerOptions { WriteIndented = true }));
```

Run once after editing in Visual Studio's editor, then your JS project sees the changes.

---

## CI integration sketch

If you maintain translations in `strings.*.json` and your .NET project under the same monorepo:

```yaml
# .github/workflows/sync-resx.yml
name: Sync RESX from JSON

on:
  push:
    paths:
      - 'locales/strings.*.json'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.x
      - name: Flatten locales
        run: |
          for f in locales/strings.*.json; do
            node scripts/flatten.mjs "$f" "$f.flat"
          done
      # Then either:
      # a) use a CLI build of JSONPrism (Phase 4 idea), or
      # b) commit the .flat.json and have a separate workflow open JSONPrism manually
```

A CLI version of JSONPrism is on the "Beyond Phase 3" wishlist in `docs/ROADMAP.md`. Until then, batch through the web/desktop UI manually when locales change.

---

## Worked example: PhantomMAC

PhantomMAC has 30+ locale files maintained as `.resx` originally. Going forward:

1. Maintain the canonical source as JSON (easier for translators using web tools like Crowdin or Lokalise)
2. On release, flatten + batch-convert through JSONPrism into `Resources.<locale>.resx`
3. Drop into the .NET project, commit
4. Visual Studio rebuilds the strongly-typed `Resources.Designer.cs`

The same approach works for AutoClickForge (~85 files, EN/VI) and any future MVVM project you scaffold.
