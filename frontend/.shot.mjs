const { chromium } = await import('playwright-core')

const url = process.argv[2] ?? 'http://localhost:3000/'
const out = process.argv[3] ?? 'shot.png'
const width = Number(process.argv[4] ?? 1440)
const height = Number(process.argv[5] ?? 900)
const full = process.argv[6] === 'full'

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForTimeout(3500)
await page.screenshot({ path: out, fullPage: full })
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 15).join('\n'))
console.log('wrote ' + out)
await browser.close()
