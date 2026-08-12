// Bootstrap for the eval TUI (`pnpm run tui`): registers the SWC ESM loader
// with Node's modern `module.register()` API (the `--loader` flag is deprecated
// in Node 24). See `scripts/tui-loader.mjs` for what the loader does.
import { register } from 'node:module';

register('./tui-loader.mjs', import.meta.url);
