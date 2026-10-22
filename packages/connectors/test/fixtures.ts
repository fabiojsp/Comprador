import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../fixtures/', import.meta.url));

export const fixture = (path: string) => readFileSync(dir + path, 'utf8');
export const fixtureJson = <T>(path: string) => JSON.parse(fixture(path)) as T;

export const NOW = '2026-10-22T05:00:00.000Z';
