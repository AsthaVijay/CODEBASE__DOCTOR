export const categories = ['Security','Code Quality','Testing','Dependencies','Documentation','Performance'] as const;
export type Category = typeof categories[number];
export type Severity = 'critical'|'high'|'medium'|'low';
export interface Issue { id:string; severity:Severity; category:Category; title:string; description:string; file:string; line:number; rule:string; recommendation:string; fixKind:'secret'|'sql'|'auth-tests'|'complexity'|'eval'|'dependency'|'docs'|'missing-tests'; }
export interface Scan { project:string; language:string; framework:string; files:number; tests:number; dependencies:number; dependencyList:Record<string,string>; sourceFiles:string[]; issues:Issue[]; categories:Record<Category,number>; health:number; scannedAt:string; }
export interface Change { path:string; before:string|null; after:string; }
export interface Check { name:string; status:'passed'|'failed'|'skipped'|'warning'|'unsupported'; detail:string; }
export interface Proposal { id:string; issueId:string; title:string; provider:'demo'|'bob'; usage?:{cost:number|null;reserved:number;taskId?:string}; status:'proposed'|'rejected'|'verified'|'failed'|'partial'; resolution?:'resolved'|'improved'; complexity?:{before:number;after:number}; explanation:string; changes:Change[]; checks:Check[]; before:Scan; after?:Scan; createdAt:string; }
export interface Repository { id:string; kind:'demo'|'upload'; label:string; scan:Scan; proposals:Proposal[]; }
export interface State { repository:Repository; adapter:{mode:'demo'|'bob'; name:string; detail:string; budget?:{total:number;accounted:number;remaining:number;perCall:number;calls:number;unconfirmed:number}}; }
