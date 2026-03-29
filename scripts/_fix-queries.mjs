import { readFileSync, writeFileSync } from 'fs';
const content = readFileSync('src/lib/db-queries.ts', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Trova la prima riga dove appare il vecchio queryOne dopo i nuovi import
let cutLine = -1;
for (let i = 50; i < lines.length; i++) {
  if (lines[i].includes('upsertMoodProfile') && lines[i+1]?.includes('return queryOne')) {
    cutLine = i;
    console.log('Cut at line:', i + 1, '->', lines[i]);
    break;
  }
}

if (cutLine === -1) {
  console.log('No cut needed or already clean');
  process.exit(0);
}

// Mantieni solo fino a cutLine (escluso) - rimuovi riga vuota prima
let end = cutLine;
while (end > 0 && lines[end - 1].trim() === '') end--;

const clean = lines.slice(0, end).join('\n') + '\n';
writeFileSync('src/lib/db-queries.ts', clean);
console.log('Cleaned! New line count:', clean.split('\n').length);
