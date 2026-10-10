import { DemoAdapter } from './DemoAdapter';
import type { GameAdapter, StorageLike } from './index';

let storage: StorageLike | undefined;
try { storage = window.localStorage; } catch { /* The playable session still works without storage. */ }
// This is the only composition point to replace when a ChainAdapter is implemented.
export const game: GameAdapter = new DemoAdapter({ storage });
