#!/usr/bin/env node
/**
 * Copy .env.example to .env if .env does not exist.
 * Run: node scripts/setup-env.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('[setup] Created .env from .env.example – add your keys for the Analytics Assistant.');
} else if (fs.existsSync(envPath)) {
  console.log('[setup] .env already exists.');
} else {
  console.warn('[setup] .env.example not found.');
}
