import { readFileSync, writeFileSync, readdirSync } from 'fs';
const dir = 'C:/Users/USER/Desktop/Final Year Research/project/.research-cache';
for (const f of readdirSync(dir).filter(x => x.endsWith('.html'))) {
  let h = readFileSync(dir + '/' + f, 'utf8');
  h = h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&mdash;|&ndash;/g, '-').replace(/&hellip;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
  const out = dir + '/' + f.replace('.html', '.txt');
  writeFileSync(out, h);
  console.log(f, '=> text', h.length, 'chars');
}
