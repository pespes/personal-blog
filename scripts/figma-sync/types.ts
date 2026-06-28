// The snapshot Claude writes after pulling Figma via the MCP. This is the only
// boundary between the MCP-dependent pull and the pure engine.
export interface FigmaSnapshotToken {
  name: string;        // e.g. "accent"
  variableId: string;  // e.g. "VariableID:5:5"
  light: string;       // hex for Light mode, e.g. "#006cac"
  dark: string;        // hex for Dark mode, e.g. "#5db1e8"
  css: string;         // code syntax, e.g. "var(--accent)"
  scopes: string[];    // e.g. ["TEXT_FILL", "STROKE_COLOR"]
}

export interface FigmaSnapshotComponent {
  name: string;                          // e.g. "Tag"
  figmaKey: string;                      // node id, e.g. "13:16"
  type: string;                          // "COMPONENT" | "COMPONENT_SET"
  variants: Record<string, string[]>;    // { Size: ["Large", "Small"] }
  props: Record<string, string>;         // { Label: "TEXT" }
  boundTokens: string[];                 // token names referenced
  description: string;
}

export interface FigmaSnapshot {
  fileKey: string;
  collection: string;                    // "Blog Tokens"
  tokens: FigmaSnapshotToken[];
  components: FigmaSnapshotComponent[];
}

// Canonical DTCG token record.
export interface DtcgToken {
  $type: "color";
  $value: string; // Light value (default mode)
  $extensions: {
    "com.figma": { variableId: string; collection: string };
    mode: { dark: string };
    css: string;
    scopes: string[];
  };
}
export type TokensFile = Record<string, DtcgToken>;

// Component manifest entry (metadata only — no codegen).
export interface ComponentEntry {
  figmaKey: string;
  type: string;
  source: string | null; // .astro path, null when unmapped
  variants: Record<string, string[]>;
  props: Record<string, string>;
  boundTokens: string[];
  description: string;
}
export type ComponentsFile = Record<string, ComponentEntry>;

export type EntityStatus =
  | "in-sync"
  | "figma-changed"
  | "code-drift"
  | "conflict"
  | "new"
  | "removed";

export interface SyncEntry {
  figmaHash: string;
  codeHash: string;
  lastSync: string; // ISO timestamp + "@" + commit
  status: EntityStatus;
}
export type SyncState = Record<string, SyncEntry>;
