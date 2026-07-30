# ADR 0001 — Styling-Architektur: Zuständigkeiten statt Geschmacksfragen

**Datum**: 2026-07-30
**Status**: akzeptiert
**Betrifft**: `frontend/tailwind.config.js`, `frontend/src/styles.scss`, jedes Angular-Template

---

## Ausgangslage

Das Frontend hatte drei Styling-Systeme parallel im Einsatz, ohne Regel, welches wofür gilt:

| System | Umfang | Problem |
|---|---|---|
| CSS-Custom-Properties (`--surface`, `--text`) mit `.dark`-Theme | Designsystem in `styles.scss` | — (das ist die Wahrheit) |
| Tailwind mit **eigenen Hex-Werten** in der Config | 158 `gray-*`-Klassen, 28 `ring-primary-500` | Werte doppelt gepflegt, folgten `.dark` nicht |
| Inline-`style="…"` | **1346 Vorkommen** | 30 % der Zeichen der drei größten Dateien |

Gemessen am Bestand (2026-07-30):

```
1346  style="…"-Attribute
 284  client-detail.component.ts        (25 % der Datei)
 279  property-detail.component.html    (45 % der Datei)
 138  dashboard.component.ts            (25 % der Datei)
  17  Klassen in styles.scss
```

Zwei Folgen, die nicht Geschmackssache sind:

1. **Dark Mode war an 22 Stellen kaputt.** `bg-white`, `text-gray-900`, `border-gray-300` ohne
   `dark:`-Gegenstück sind eingefrorene Hellmodus-Farben. Darunter der App-Wurzel-Container
   in `app.component.ts`, der den `--bg`-Hintergrund von `body` überschrieb.
2. **Jede gefärbte Tailwind-Klasse brauchte zwei Deklarationen** (`bg-white dark:bg-gray-800`),
   wo eine CSS-Variable mit einer auskommt. Das ist die Doppelpflege, die zu (1) führt.

Der Token-Verbrauch beim Lesen der Templates war der Anlass der Diskussion, ist aber der
schwächste Grund. Er wird hier als Nebeneffekt mitgenommen, nicht als Ziel.

## Entscheidung

Jedes der drei Systeme bekommt **genau eine** Zuständigkeit. Keins wird abgeschafft.

### 1. CSS-Custom-Properties sind die einzige Farbquelle

`tailwind.config.js` führt keine eigenen Farbwerte mehr, sondern zeigt auf die Variablen:

```js
surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
body:    { DEFAULT: 'var(--text)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
success: { DEFAULT: 'var(--color-success)', soft: 'var(--color-success-soft)' },
```

Damit sind `bg-surface`, `text-body-3`, `border-border`, `bg-page`, `text-error` **themefähig**
— eine `dark:`-Variante ist überflüssig und ihr Fehlen kein Bug mehr.

**Einschränkung**: Auf diesen Farben funktioniert die Opacity-Kurzschreibweise (`bg-surface/50`)
nicht, weil `var()` keine Kanalwerte liefert. Für abgeschwächte Flächen gibt es die
`--*-soft`-Variablen. Geprüft: im Bestand wurde die Kurzschreibweise auf diesen Farben nirgends
verwendet.

### 2. Tailwind macht Layout, Abstand und Typografie

Das tut es faktisch schon (86× `grid`, 54× `flex`). Zusätzlich kennt die Config jetzt die
Schriftgrade, die das Projekt wirklich benutzt — Tailwinds Standardskala traf sie nicht:

```
278x font-size:13px    ← häufigster Wert im Projekt, text-sm ist 14px
140x font-size:12px     98x 14px     78x 11px     58x 15px
```

`fontSize: { '10','11','12','13','14','15','16','18','20','22','26' }`

Damit wird aus
`style="color:var(--text);font-size:13px;font-weight:600"` (54 Zeichen, **37 Vorkommen**)
ein `class="text-13 text-body font-semibold"` (38 Zeichen) — ohne neues Vokabular.

### 3. `styles.scss` macht wiederkehrende Bausteine — und nur die

Neu in `@layer components`, jeweils mit belegter Vorkommenszahl aus dem Bestand:

| Klasse | Ersetzt | Vorkommen |
|---|---|---|
| `.surface-card` | Karte ohne Schatten (Sidebar-Spalte) | 13 |
| `.kv-row` / `.kv-label` / `.kv-value` | Beschriftung-Wert-Zeile in Info-Karten | 11 |
| `.section-label` | Großbuchstaben-Überschrift in Karten | 15 |

**Reine Typografie oder reines Layout gehört hier nicht hinein** — das drückt Tailwind aus.
Eine Klasse kommt nur dazu, wenn das Muster eine eigene *Bedeutung* trägt.

### 4. Inline-`style` bleibt erlaubt — für berechnete Werte

Das ist die Regel, an der man Verstöße erkennt:

```html
<!-- RICHTIG: der Wert kommt aus Daten -->
<div class="funnel-fill" [style.width.%]="s.widthPct" [style.background]="s.color"></div>
<span [style.color]="getStageColor(stage)">…</span>

<!-- FALSCH: statisches Styling, gehört in Klassen -->
<div style="background:var(--surface);border-radius:14px;border:1px solid var(--border);">
```

Statisches `style="…"` mit konstanten Werten ist ab jetzt ein Review-Befund.
`[style.x]`-Bindings mit datenabhängigen Werten sind ausdrücklich in Ordnung — die
Trichterbalken, Stufenfarben und Fortschrittsbreiten wären als Klassen nur umständlicher.

## Was bewusst *nicht* passiert ist

- **Kein Big-Bang-Refactor der 1346 Inline-Styles.** Ein Commit über 1300 Stellen ist nicht
  reviewbar, und eine Regression darin fällt niemandem auf. Die Migration läuft
  opportunistisch: wer eine Datei ohnehin anfasst, stellt die berührten Stellen um.
  Vier Dateien tragen 60 % aller Vorkommen — dort lohnt es, überall sonst nicht.
- **Tailwind wurde nicht entfernt.** Es trägt die Layout-Arbeit an ~140 Stellen; ein Ersatz
  durch handgeschriebenes Flex/Grid hätte keinen Gegenwert.
- **`gray-*` wurde nicht massenmigriert.** 158 Vorkommen, überwiegend korrekt mit
  `dark:` gepaart, also funktionierend. Sie sind Migrations-Restposten, kein Bug.
  Neuer Code benutzt sie nicht mehr.

## Konsequenzen

**Gut:**
- Dark-Mode-Divergenz ist als Fehlerklasse beseitigt, nicht nur an 22 Stellen repariert.
- Eine Farbänderung im Designsystem wirkt in beiden Systemen gleichzeitig.
- Templates werden beim Lesen kürzer; das spart Kontext bei jeder künftigen Änderung.

**Preis:**
- Zwei Orte für Styling statt einem — die Zuordnungsregel muss man kennen. Deshalb steht
  sie in `CLAUDE.md` und nicht nur hier.
- Übergangszeit mit gemischtem Stil in denselben Dateien. Bewusst in Kauf genommen,
  siehe oben.

**Prüfbar:** Ob eine Klasse wirklich auf die Variable auflöst, zeigt das gebaute Bundle:

```bash
cd frontend && npm run build
grep -o '\.bg-surface{[^}]*}' dist/*/styles*.css
# → .bg-surface{background-color:var(--surface)}
```

Nicht benutzte Klassen aus `@layer components` entfernt Tailwind aus dem Bundle. Sie
kosten also keine Bytes, aber sie belügen den nächsten Leser — eine Klasse ohne Aufrufstelle
gehört gelöscht.

## Offen

Die Migration der verbleibenden Inline-Styles in den vier großen Dateien ist als
GitHub-Issue erfasst, nicht als Aufgabe dieses Commits.
