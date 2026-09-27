import path from 'node:path';
import {safePath} from './archive';

export const isTestFile = (file:string) => /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.|(?:^|\/)test_[^/]+\.py$|_test\.(?:go|rb|rs)$|(?:Test|Tests)\.java$/.test(file);

// Only inspect JSON and path names; never import repository configuration.
export function detectTestConvention(files:string[], pkg:Record<string,unknown> = {}):{runner:string;testGlob:string} {
  const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? Object.values(pkg.scripts).filter((v):v is string=>typeof v==='string') : [];
  const runner = ['vitest','mocha','jest'].find(r=>scripts.some(s=>new RegExp(`\\b${r}\\b`).test(s)) || files.some(f=>f.includes(`${r}.config`)) || (r==='jest'&&!!pkg?.jest)) || 'node:test';
  const jest = pkg?.jest && typeof pkg.jest==='object' ? pkg.jest as Record<string,unknown> : {};
  const match = Array.isArray(jest.testMatch) ? jest.testMatch.find((v:unknown)=>typeof v==='string'&&v.startsWith('<rootDir>/')&&v.includes('*')) : undefined;
  const root = Array.isArray(jest.roots) ? jest.roots.find((v:unknown)=>typeof v==='string'&&/tests?|__tests__/.test(v)) : undefined;
  const configured = typeof match==='string' ? match.replace('<rootDir>/','').split(/[*?{]/)[0].replace(/\/$/,'') : typeof root==='string' ? root.replace(/^<rootDir>\//,'').replace(/\/$/,'') : '';
  if(configured){try{safePath(configured);return {runner,testGlob:configured+'/'};}catch{/* unsafe config is not a writable path */}}
  const directory = files.map(f=>f.match(/^(.*(?:^|\/)(?:tests?|__tests__))\//)?.[1]).find(Boolean);
  return {runner,testGlob:directory?directory+'/':files.some(isTestFile)?'colocated':'tests/'};
}

export function suggestedTestPath(file:string, files:string[], pkg:Record<string,unknown>):string {
  const ext=path.posix.extname(file), name=path.posix.basename(file,ext);
  const {runner,testGlob}=detectTestConvention(files,pkg);
  const testName=ext==='.java'?`${name}Test.java`:ext==='.py'?`test_${name}.py`:ext==='.rb'?`${name}_test.rb`:ext==='.go'?`${name}_test.go`:ext==='.rs'?`${name}_test.rs`:['.ts','.tsx','.jsx'].includes(ext)?`${name}.test${ext}`:`${name}.test${runner==='node:test'?'.cjs':ext}`;
  const dir=ext==='.java'&&file.includes('src/main/java/')?path.posix.dirname(file.replace('src/main/java/','src/test/java/')):ext==='.go'||testGlob==='colocated'?path.posix.dirname(file):testGlob;
  return safePath(path.posix.join(dir,testName));
}
