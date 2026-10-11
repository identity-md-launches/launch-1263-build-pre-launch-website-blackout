import { writeFileSync } from 'node:fs';
import { docsSections } from '../src/docs';

const text = (html: string): string => html.replace(/<strong>(.*?)<\/strong>/gs, '**$1**').replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/gs, '[$2]($1)').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
function markdown(html: string) {
  return html.replace(/<div class="docs-table"[^>]*>\s*<table>(.*?)<\/table>\s*<\/div>/gs, (_, body: string) => {
    const rows = [...body.matchAll(/<tr>(.*?)<\/tr>/gs)].map(row => [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map(cell => text(cell[1])));
    const caption = body.match(/<caption>(.*?)<\/caption>/s)?.[1] || '';
    return `\n\n${text(caption)}\n\n| ${rows[0].join(' | ')} |\n| ${rows[0].map(()=>'---').join(' | ')} |\n${rows.slice(1).map(row=>`| ${row.join(' | ')} |`).join('\n')}\n\n`;
  }).replace(/<\/p>/g, '\n\n').replace(/<li>/g, '\n- ').replace(/<\/ol>/g, '\n\n').replace(/<strong>(.*?)<\/strong>/gs, '**$1**').replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/gs, '[$2]($1)').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
writeFileSync('docs.md', '# BLACKOUT player guide\n\n**Beta values, may change.** Playable demo; no wallet or real money. Generated from `src/docs.ts` with `npx vite-node scripts/export-docs.ts`.\n\n' + docsSections.map(s=>`## ${s.title}\n\n${markdown(s.body)}\n`).join('\n'));
