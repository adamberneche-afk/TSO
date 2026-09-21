#!/usr/bin/env node
// typescript-eslint refuses to load under TypeScript 7's native compiler
// (it hard-checks ts.versionMajorMinor and throws for >= 7 -- see
// https://github.com/typescript-eslint/typescript-eslint/issues/10940,
// unresolved as of the latest published release). @typescript/typescript6
// is the classic JS-based compiler kept published for exactly this
// transition. npm's own `overrides` mechanism can express "give this one
// dependency's own 'typescript' a different version" for a real
// dependency, but typescript-eslint only declares 'typescript' as a
// peerDependency, and overriding a peer triggers npm's strict
// ERESOLVE check against every other package in the tree that also
// wants real typescript@7 (which is correct behavior on npm's part --
// there's no actual conflict, just two same-named packages coexisting
// at different levels).
//
// This script does by hand exactly what a successful override would
// produce: a nested node_modules/typescript inside typescript-eslint's
// own install, shadowing the hoisted real typescript@7 for anything
// required from within typescript-eslint specifically.

const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const source = path.join(root, 'node_modules', '@typescript', 'typescript6');

if (!fs.existsSync(source)) {
  // Not installed in this tree (e.g. a package that doesn't use
  // typescript-eslint at all) -- nothing to do.
  process.exit(0);
}

function findTypescriptEslintDirs(dir, depth) {
  const found = [];
  if (depth > 4) return found;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'typescript-eslint' || entry.name === 'ts-api-utils') {
      // The meta-package and its shared AST/type-utility dependency,
      // plus every individual @typescript-eslint/* package it bundles
      // (eslint-plugin, parser, typescript-estree, ...) below -- each
      // touches the classic TS compiler API directly. ts-api-utils'
      // own declared peer range is permissive enough to nominally allow
      // TS7, but its actual code isn't -- it needs linking regardless
      // of what its package.json claims.
      found.push(path.join(dir, entry.name));
    } else if (entry.name === '@typescript-eslint') {
      const scoped = path.join(dir, entry.name);
      for (const sub of fs.readdirSync(scoped, { withFileTypes: true })) {
        if (sub.isDirectory()) found.push(path.join(scoped, sub.name));
      }
    } else if (entry.name === 'node_modules') {
      found.push(...findTypescriptEslintDirs(path.join(dir, entry.name), depth + 1));
    } else if (entry.name.startsWith('.')) {
      continue;
    } else {
      const nested = path.join(dir, entry.name, 'node_modules');
      if (fs.existsSync(nested)) {
        found.push(...findTypescriptEslintDirs(nested, depth + 1));
      }
    }
  }
  return found;
}

const targets = findTypescriptEslintDirs(path.join(root, 'node_modules'), 0);

for (const dir of targets) {
  const nestedNodeModules = path.join(dir, 'node_modules');
  const linkPath = path.join(nestedNodeModules, 'typescript');

  fs.mkdirSync(nestedNodeModules, { recursive: true });

  const relativeSource = path.relative(nestedNodeModules, source);
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink() && fs.readlinkSync(linkPath) === relativeSource) {
      continue; // already correct
    }
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {
    // doesn't exist yet
  }

  fs.symlinkSync(relativeSource, linkPath, 'dir');
  console.log(`[link-typescript-eslint-compiler] linked ${path.relative(root, linkPath)} -> @typescript/typescript6`);
}
