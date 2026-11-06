import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function nativeVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Native builds need a major.minor.patch version');
  const [major, minor, patch] = version.split('.').map(Number);
  const build = major * 1000000 + minor * 1000 + patch;
  if (minor > 999 || patch > 999 || build < 1 || build > 2100000000) throw Error('Version exceeds native build-number limits');
  return {version, build};
}

export function syncNativeVersion(root) {
  const {version} = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const info = nativeVersion(version);
  const project = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj');
  const source = fs.readFileSync(project, 'utf8');
  const next = source.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${info.build};`)
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${info.version};`);
  if (source !== next) fs.writeFileSync(project, next);
  return info;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  console.log('KTD native version', syncNativeVersion(root));
}
