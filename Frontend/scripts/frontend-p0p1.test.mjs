import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [api, destinations, widget, app, css] = await Promise.all([
  read('src/lib/api.ts'),
  read('src/services/destinationsApi.ts'),
  read('src/components/RadenGajahChatWidget.tsx'),
  read('src/App.tsx'),
  read('src/index.css'),
]);

assert.match(api, /localhost:4000\/api\/v1/);
assert.doesNotMatch(destinations, /localhost:3000|localhost:8000/);
assert.match(destinations, /apiClient\.get\('\/destinations'/);
assert.match(destinations, /apiClient\.post\('\/planner\/generate'/);
assert.match(destinations, /apiClient\.post\('\/planner\/swap-slot'/);
assert.match(widget, /w-\[calc\(100vw-1\.5rem\)\]/);
assert.match(widget, /max-w-\[calc\(100vw-1\.5rem\)\]/);
assert.match(css, /:focus-visible/);
assert.match(app, /href="#main-content"/);
assert.match(app, /id="main-content"/);

console.log('Frontend P0/P1 contract checks passed.');
