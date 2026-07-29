import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import type { Plugin } from 'unified';

/**
 * GFM görev listesi (`- [ ] ...`) onay kutuları bu sitede yalnızca okunur bir
 * kontrol listesi olarak kullanılır; hiçbir forma bağlı değildir ve zaten
 * `disabled`'dır. Erişilebilir bir isme (label) sahip olmadıklarından
 * axe-core bunları WCAG 4.1.2 ihlali olarak işaretler. Madde metni zaten tam
 * cümle olarak okunduğundan, işlevsiz kutuyu erişilebilirlik ağacından
 * gizlemek (aria-hidden) en doğru çözümdür.
 */
export const rehypeTaskListA11y: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'element', (node: Element) => {
    if (
      node.tagName === 'input' &&
      node.properties?.type === 'checkbox' &&
      node.properties?.disabled
    ) {
      node.properties.ariaHidden = 'true';
    }
  });
};
