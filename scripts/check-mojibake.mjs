import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.cwd();
const includeDirs = ['src', 'supabase/functions'];
const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']);
const suspiciousPattern =
  /Ã¡|Ã¢|Ã£|Ã¤|Ã§|Ã©|Ãª|Ã­|Ã³|Ã´|Ãµ|Ãº|Ã¼|Â |â€™|â€œ|â€|ï¿½|�/g;

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!validExtensions.has(extname(fullPath))) {
      continue;
    }

    const content = readFileSync(fullPath, 'utf8');
    const matches = [...content.matchAll(suspiciousPattern)];

    if (matches.length === 0) {
      continue;
    }

    offenders.push({
      file: fullPath.replace(`${root}\\`, '').replaceAll('\\', '/'),
      samples: matches.slice(0, 5).map((match) => match[0]),
    });
  }
}

for (const dir of includeDirs) {
  walk(join(root, dir));
}

if (offenders.length > 0) {
  console.error('Possible mojibake found in text files:');

  for (const offender of offenders) {
    console.error(`- ${offender.file} -> ${offender.samples.join(', ')}`);
  }

  process.exit(1);
}

console.log('No mojibake found.');
