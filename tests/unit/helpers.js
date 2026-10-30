'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

/** Executes browser scripts in this test process (each test file runs in its own process). */
function load(...files) {
  for (const file of files) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInThisContext(code, { filename: file });
  }
  return globalThis.LQ;
}

/** Runs fn while capturing console.warn calls. */
function captureWarnings(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}

function readSource(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function listScripts() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(relative);
      else if (entry.name.endsWith('.js')) files.push(relative);
    }
  };
  walk('js');
  return files;
}

module.exports = { ROOT, load, captureWarnings, readSource, listScripts };
