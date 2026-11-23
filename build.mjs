import { copyFileSync, cpSync } from 'node:fs';

for (const name of ['index.html', 'styles.css']) {
  copyFileSync(new URL(`src/${name}`, import.meta.url), new URL(`dist/${name}`, import.meta.url));
}
cpSync(new URL('public/', import.meta.url), new URL('dist/assets/', import.meta.url), { recursive: true });
cpSync(new URL('../backend/data/', import.meta.url), new URL('dist/data/', import.meta.url), { recursive: true });
