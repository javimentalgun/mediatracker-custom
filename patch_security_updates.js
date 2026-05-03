// Security updates for CVE-flagged dependencies (HIGH/CRITICAL).
//
// Detected via Trivy scan on bonukai/mediatracker:latest:
//   - axios            0.29.0 → 0.30.0   (CVE-2025-27152, CVE-2025-58754, CVE-2026-25639) — HIGH SSRF/DoS
//   - fast-xml-parser  4.5.1  → 4.5.5    (CVE-2026-25896) — CRITICAL XSS via DOCTYPE
//   - form-data        4.0.1  → 4.0.4    (CVE-2025-7783) — CRITICAL unsafe random
//   - lodash           4.17.21→ 4.18.0   (CVE-2026-4800) — HIGH RCE via template imports
//   - path-to-regexp   0.1.12 → 0.1.13   (CVE-2026-4867) — HIGH ReDoS  (transitive via express)
//   - tar-fs           2.1.1  → 2.1.4    (CVE-2024-12905, CVE-2025-48387, CVE-2025-59343) — HIGH path traversal/symlink (transitive)
//
// Strategy:
//   - Direct deps: bump in `dependencies` so `npm install` picks them up.
//   - Transitive deps: declare `overrides` so npm forces the version everywhere.
//
// Run as a Dockerfile RUN step (followed by `npm install --legacy-peer-deps`).

const fs = require('fs');
const pkgPath = '/app/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const before = JSON.stringify(pkg.dependencies);

pkg.dependencies = pkg.dependencies || {};
pkg.dependencies.axios = '^0.30.0';
pkg.dependencies['fast-xml-parser'] = '^4.5.5';
pkg.dependencies['form-data'] = '^4.0.4';
pkg.dependencies.lodash = '^4.18.0';

pkg.overrides = pkg.overrides || {};
// Plain global overrides (apply everywhere unless a deeper-nested rule wins).
pkg.overrides['path-to-regexp'] = '^0.1.13';
pkg.overrides['tar-fs'] = '^2.1.4';
pkg.overrides.axios = '^0.30.0';
pkg.overrides['fast-xml-parser'] = '^4.5.5';
pkg.overrides['form-data'] = '^4.0.4';
pkg.overrides.lodash = '^4.18.0';
// Explicit nested override for express → path-to-regexp because the global
// rule alone didn't propagate into express's bundled node_modules in our setup.
pkg.overrides.express = pkg.overrides.express || {};
pkg.overrides.express['path-to-regexp'] = '^0.1.13';

if (JSON.stringify(pkg.dependencies) === before && pkg.overrides && Object.keys(pkg.overrides).length === 0) {
  console.log('security updates: already applied');
  process.exit(0);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('security updates: package.json updated');
console.log('  direct: axios, fast-xml-parser, form-data, lodash');
console.log('  overrides: path-to-regexp, tar-fs (+ direct deps for transitive enforcement)');
