import { writeFileSync } from 'fs';
const targets = {
  reactbits: 'https://reactbits.dev',
  shadcn: 'https://ui.shadcn.com/docs/components/card',
  twentyone: 'https://21st.dev',
  linear: 'https://linear.app',
  vercel: 'https://vercel.com/templates',
  apple: 'https://www.apple.com/iphone-16/',
  stripe: 'https://stripe.com',
  rauno: 'https://rauno.me',
  pitch: 'https://pitch.com',
};
(async () => {
  for (const [k, url] of Object.entries(targets)) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36' }, redirect: 'follow' });
      const t = await r.text();
      writeFileSync('C:/Users/USER/Desktop/Final Year Research/project/.research-cache/' + k + '.html', t);
      console.log(k, '=>', r.status, t.length, 'bytes');
    } catch (e) { console.log(k, 'FAILED', e.message); }
  }
  console.log('DONE');
})();
