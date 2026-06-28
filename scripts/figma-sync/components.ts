import type { ComponentEntry, ComponentsFile, FigmaSnapshot } from "./types";

export function snapshotToComponents(
  s: FigmaSnapshot,
  existing: ComponentsFile,
  resolveSource: (name: string) => string | null = () => null,
): ComponentsFile {
  const out: ComponentsFile = {};
  const sorted = [...s.components].sort((a, b) => a.name.localeCompare(b.name));
  for (const c of sorted) {
    const prior = existing[c.name];
    out[c.name] = {
      figmaKey: c.figmaKey,
      type: c.type,
      source: prior?.source ?? resolveSource(c.name),
      variants: c.variants,
      props: c.props,
      boundTokens: [...c.boundTokens].sort(),
      description: c.description,
    };
  }
  return out;
}

export function unmappedComponents(c: ComponentsFile): string[] {
  return Object.keys(c)
    .filter((n) => !c[n].source)
    .sort();
}

export function componentFigmaProjection(e: ComponentEntry): unknown {
  return {
    figmaKey: e.figmaKey,
    type: e.type,
    variants: e.variants,
    props: e.props,
    boundTokens: e.boundTokens,
    description: e.description,
  };
}
