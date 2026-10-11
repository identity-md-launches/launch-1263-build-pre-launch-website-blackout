import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { docsSections } from '../src/docs';

const markdown = readFileSync(new URL('../docs.md', import.meta.url), 'utf8');
const rendered = docsSections.map(s => s.body).join('\n');

describe('game design documentation and configuration', () => {
  it.each([['Markdown', markdown], ['In-site guide', rendered]])('%s describes all six corrected rules', (_, guide) => {
    expect(guide).toContain('BLACKOUT game token will launch through IMD on Robinhood Chain');
    expect(guide).toContain('10% of supply goes to IMD swarm contributor agents');
    expect(guide).toContain('part of supply seeds the game reward pool');
    expect(guide.toLowerCase()).toMatch(/exact (supply )?split (will be )?announced at launch/);
    expect(guide).toContain('Only the top 10% of farms by hashrate are audited');
    expect(guide).toContain('10% of that epoch’s mining goes to the reward pool');
    expect(guide).toContain('Never takes from player balances');
    expect(guide).toContain('Common gives no set bonus; Rare +5%, Epic +10%, Legendary +20%, Mythic +30%');
    expect(guide).toContain('Only the strongest set applies');
    expect(guide).toContain('Triple Core replaces Compute Duo');
    expect(guide).toContain('they never stack');
    expect(guide).toContain('Each level adds +10% hash, up to 5 levels (+50%)');
    expect(guide).toContain('Cost rises each level');
    expect(guide).toContain('extra wear and power use before confirming');
    expect(guide).toContain('Base tariff is 15% of mining output, withheld each epoch');
    expect(guide).toContain('Electricity has no separate reserve or refill');
    expect(guide.toLowerCase()).toContain('beta values, may change');
    expect(guide).not.toMatch(/IMD is planned to launch|Common \+5%|can both apply|refill it with tokens|Takes 10% of the affected farm/);
  });
  it('keeps the corrected economic parameters and launch intent in config', () => {
    expect(config.launch).toEqual({token: 'BLACKOUT game token', through: 'IMD', chain: 'Robinhood Chain', rewardPoolSeed: 'Part of supply', supplySplit: 'Exact split announced at launch'});
    expect(config.allocations.swarmContributorSupply).toBe(.1);
    expect(Object.values(config.rarity).map(r => r.setBonus)).toEqual([0, .05, .1, .2, .3]);
    expect(config.combos).toMatchObject({ computeDuo: .1, tripleCore: .2, tripleReplacesDuo: true });
    expect(config.events).toMatchObject({ auditTopFraction: .1, auditTax: .1 });
    expect(config.overclock).toMatchObject({ maximum: 5, hashPerLevel: .1 });
    expect(config.electricity).toEqual({ tariff: .15, cheapMultiplier: .5 });
    expect(config.costs).not.toHaveProperty('electricity');
  });
});
