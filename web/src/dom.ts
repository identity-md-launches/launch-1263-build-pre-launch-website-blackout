/** Patch mounted views without replacing their section, focus or keyed records. */
const key = (node: Node): string | null => node instanceof Element
 ? node.getAttribute('data-key') ?? (node.id ? `id:${node.id}` : null) : null;
function compatible(a: Node, b: Node) {
 return a.nodeType === b.nodeType && (!(a instanceof Element) || b instanceof Element && a.tagName === b.tagName && a.namespaceURI === b.namespaceURI);
}
function patchNode(current: Node, next: Node) {
 if (current.nodeType === Node.TEXT_NODE || current.nodeType === Node.COMMENT_NODE) {
  if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
  return;
 }
 if (!(current instanceof Element) || !(next instanceof Element)) return;
 for (const attr of Array.from(current.attributes)) {
  if (attr.name === 'open' && current instanceof HTMLDetailsElement) continue;
  if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
 }
 for (const attr of Array.from(next.attributes)) {
  if (attr.name === 'open' && current instanceof HTMLDetailsElement) continue;
  if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
 }
 // Number animation owns only the existing text node; inputs retain native edits.
 if (current.hasAttribute('data-number') || current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) return;
 patchChildren(current, next);
}
function patchChildren(parent: Node, next: Node) {
 const keyed = new Map(Array.from(parent.childNodes).flatMap(n => key(n) ? [[key(n)!, n] as const] : []));
 let cursor = parent.firstChild;
 for (const wanted of Array.from(next.childNodes)) {
  const id = key(wanted);
  let current: Node | undefined = id ? keyed.get(id) : cursor && !key(cursor) && compatible(cursor, wanted) ? cursor : undefined;
  if (current && !compatible(current, wanted)) current = undefined;
  if (!current && !id && cursor) current = Array.from(parent.childNodes).find(n=>!key(n)&&compatible(n,wanted)&&(!cursor||Array.from(parent.childNodes).indexOf(n)>=Array.from(parent.childNodes).indexOf(cursor)));
  if (!current) {
   current = wanted.cloneNode(true);
   parent.insertBefore(current, cursor);
  } else {
   if (current !== cursor) parent.insertBefore(current, cursor);
   patchNode(current, wanted);
  }
  cursor = current.nextSibling;
 }
 while (cursor) { const next = cursor.nextSibling; parent.removeChild(cursor); cursor = next; }
}
export function patchHTML(target: Element, html: string) {
 const template = document.createElement('template');
 template.innerHTML = html;
 patchChildren(target, template.content);
}
export function setText(target: Node, value: string) {
 if (target.childNodes.length === 1 && target.firstChild?.nodeType === Node.TEXT_NODE) {
  if (target.firstChild.nodeValue !== value) target.firstChild.nodeValue = value;
 } else if (target.textContent !== value) target.textContent = value;
}
