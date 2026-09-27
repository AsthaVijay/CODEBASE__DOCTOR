import {demoAdapter} from './adapter';
import {liveAdapter} from './live';
import {budgetStatus} from './budget';
// Local recipes are available only through an explicit offline/test override.
// Missing credentials or a failed Bob call must never select a local replacement.
export function getBobAdapter(){return process.env.BOB_PROVIDER==='demo'?demoAdapter:liveAdapter;}
export async function adapterInfo(){const live=getBobAdapter().mode==='bob';return {mode:live?'bob' as const:'demo' as const,name:live?'IBM Bob Shell':'Deterministic local adapter',detail:live?'Bob-only proposals are enabled; no local fallback is used. Valid authentication and available Bobcoins are required. Connection is confirmed only when a live proposal succeeds. Source changes always require approval.':'Demo mode was explicitly selected. Existing Bob credentials are not used. Restart without the BOB_PROVIDER=demo override to enable your configured live provider.',budget:await budgetStatus()};}
