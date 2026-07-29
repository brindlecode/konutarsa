import { visit } from 'unist-util-visit';
import type { Root, Text, Parent, PhrasingContent } from 'mdast';
import type { Plugin } from 'unified';

const SOURCE_REF_PATTERN = /\[\[source:([a-z0-9][a-z0-9-]*)\]\]/g;

interface DeclaredSource {
  key?: string;
}

interface AstroFrontmatter {
  status?: string;
  sources?: DeclaredSource[];
  sourceUsageOrder?: string[];
  [key: string]: unknown;
}

interface VFileWithAstroData {
  data: {
    astro?: {
      frontmatter?: AstroFrontmatter;
    };
  };
  path?: string;
  history?: string[];
}

/**
 * Transforms the low-friction `[[source:key]]` citation syntax into an
 * accessible footnote-style link, e.g. <sup><a href="#source-key">[1]</a></sup>.
 * Numbering follows first-use order within the document. Writes the resolved
 * order back to `remarkPluginFrontmatter.sourceUsageOrder` so the page template
 * can render a matching numbered source list in the same order.
 *
 * Published content referencing an undeclared source key fails the build —
 * this is the render-time safety net; scripts/validate-content.mjs is the
 * primary, faster pre-build gate for the same rule.
 */
export const remarkSourceRefs: Plugin<[], Root> = () => {
  return (tree, file) => {
    const vfile = file as unknown as VFileWithAstroData;
    const frontmatter = vfile.data.astro?.frontmatter;
    if (!frontmatter) return;

    const declared = Array.isArray(frontmatter.sources) ? frontmatter.sources : [];
    const sourceKeys = new Set(
      declared.map((s) => s.key).filter((k): k is string => typeof k === 'string' && k.length > 0)
    );
    const usageOrder: string[] = [];
    const missingKeys: string[] = [];

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (!node.value.includes('[[source:')) return;

      SOURCE_REF_PATTERN.lastIndex = 0;
      if (!SOURCE_REF_PATTERN.test(node.value)) return;
      SOURCE_REF_PATTERN.lastIndex = 0;

      const parts: PhrasingContent[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = SOURCE_REF_PATTERN.exec(node.value))) {
        const key = match[1] ?? '';
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }

        if (sourceKeys.has(key)) {
          if (!usageOrder.includes(key)) usageOrder.push(key);
          const orderNumber = usageOrder.indexOf(key) + 1;
          parts.push({
            type: 'html',
            value: `<sup class="source-ref"><a href="#source-${key}" aria-label="Kaynak ${orderNumber}">[${orderNumber}]</a></sup>`,
          } as PhrasingContent);
        } else {
          missingKeys.push(key);
          parts.push({
            type: 'html',
            value: `<mark class="source-ref-missing">[[kaynak eksik: ${key}]]</mark>`,
          } as PhrasingContent);
        }

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      (parent as Parent).children.splice(index, 1, ...parts);
      return index + parts.length;
    });

    frontmatter.sourceUsageOrder = usageOrder;

    if (missingKeys.length > 0 && frontmatter.status === 'published') {
      const filePath = vfile.path ?? vfile.history?.[0] ?? 'bilinmeyen dosya';
      throw new Error(
        `[konutarsa] Kaynak anahtarı bulunamadı: "${missingKeys.join(', ')}" (dosya: ${filePath}). ` +
          `Bu anahtar(lar)ı içeriğin "sources" listesine ekleyin veya [[source:...]] referansını kaldırın.`
      );
    }
  };
};
