import { describe, expect, it } from 'vitest';
import { DemoAdapter } from '../src/game/DemoAdapter';
import { config } from '../src/config';
import { COOLING, equippedIds, EXTRA_SLOTS, HASHRATE, nextRandom, rollRarity, rollType, roomHashrate, slotsFor, totalHashrate } from '../src/game/rules';
import { ITEM_TYPES, RARITIES } from '../src/game/types';
import type { GameState, Item, Rarity } from '../src/game/types';

class MemoryStorage {
  data = new Map<string,string>();
  getItem(key:string) { return this.data.get(key)??null; }
  setItem(key:string,value:string) { this.data.set(key,value); }
}
function session(seed = 1234567) {
  let time = 100_000;
  const storage = new MemoryStorage();
  const now = () => time;
  let adapter = new DemoAdapter({storage,now,seed});
  return {
    get game(){return adapter;}, storage, now,
    advance(ms:number){time+=ms;},
    reload(){adapter=new DemoAdapter({storage,now,seed});return adapter;},
    async fixture(edit:(s:GameState)=>void){const state=await adapter.getFarm();edit(state);storage.setItem(config.demo.storageKey,JSON.stringify(state));adapter=new DemoAdapter({storage,now,seed});return state;}
  };
}
const makeItem = (id: number,type:Item['type']='GPU',rarity:Rarity='Common'): Item => ({id:`item-${id}`,type,rarity,durability:100});

describe('100,000 independent demo rolls',()=> {
  it('matches 70/22/7/1 rarity and 60/20/12/8 type within 0.5 percentage points',()=> {
    const rarity=Object.fromEntries(RARITIES.map(r=>[r,0]));
    const type=Object.fromEntries(ITEM_TYPES.map(t=>[t,0]));
    let seed=0x12345678;
    for(let n=0;n<100_000;n++) {
      let value:number;[value,seed]=nextRandom(seed);rarity[rollRarity(value)]++;
      [value,seed]=nextRandom(seed);type[rollType(value)]++;
    }
    RARITIES.forEach((r,i)=>expect(Math.abs(rarity[r]/100_000-[.7,.22,.07,.01][i])).toBeLessThan(.005));
    ITEM_TYPES.forEach((t,i)=>expect(Math.abs(type[t]/100_000-[.6,.2,.12,.08][i])).toBeLessThan(.005));
    console.info('100k rolls:',JSON.stringify({rarity,type}));
  });
  it('uses exact category boundaries',()=> {
    expect([0,.69999,.7,.91999,.92,.98999,.99,.99999].map(rollRarity)).toEqual(['Common','Common','Rare','Rare','Epic','Epic','Legendary','Legendary']);
    expect([0,.6,.8,.92].map(rollType)).toEqual(['GPU','Cooling','PSU','Room']);
  });
});

describe('hashrate and equipment rules',()=> {
  it.each(RARITIES)('%s GPU and cooling use the specified math',async rarity=> {
    const s=session();
    await s.fixture(state=>{state.inventory=[makeItem(2,'GPU',rarity),makeItem(3,'Cooling',rarity)];state.rooms[0].gpu[0]='item-2';state.rooms[0].cooling='item-3';});
    const farm=await s.game.getFarm();
    expect(totalHashrate(farm)).toBeCloseTo(HASHRATE[rarity]*(1+COOLING[rarity]));
    farm.rooms[0].overclock=2;farm.inventory[0].durability=50;
    expect(roomHashrate(farm,farm.rooms[0])).toBeCloseTo(HASHRATE[rarity]*.5*(1+COOLING[rarity])*1.5);
  });
  it.each(RARITIES)('%s power supply adds the specified slots',async rarity=> {
    const s=session();await s.fixture(state=>state.inventory.push(makeItem(9,'PSU',rarity)));
    await s.game.place('item-9',0,'psu');const farm=await s.game.getFarm();
    expect(slotsFor(farm,farm.rooms[0])).toBe(2+EXTRA_SLOTS[rarity]);
    expect(farm.rooms[0].gpu).toHaveLength(2+EXTRA_SLOTS[rarity]);
  });
  it('blocks wrong slots, duplicate placements and removing occupied PSU expansion',async()=> {
    const s=session();await s.fixture(state=>state.inventory.push(makeItem(9,'PSU','Rare')));
    await expect(s.game.place('item-1',0,'cooling')).rejects.toThrow('Cooling');
    await expect(s.game.place('item-1',0,'gpu',2)).rejects.toThrow('Power supply');
    await s.game.place('item-9',0,'psu');await s.game.place('item-1',0,'gpu',3);
    await expect(s.game.place('item-1',0,'gpu',0)).rejects.toThrow('installed');
    await expect(s.game.unplace(0,'psu')).rejects.toThrow('extra slots');
    await s.game.unplace(0,'gpu',3);await s.game.unplace(0,'psu');
    expect((await s.game.getFarm()).rooms[0].gpu).toHaveLength(2);
  });
  it('unlocks exactly one additional room and returns unplaced items',async()=> {
    const s=session();await s.fixture(state=>state.inventory.push(makeItem(8,'Room'),makeItem(9,'Room')));
    await s.game.place('item-8',1,'room');await s.game.place('item-1',1,'gpu',0);
    expect(equippedIds(await s.game.getFarm()).has('item-1')).toBe(true);
    await s.game.unplace(1,'gpu',0);
    expect(equippedIds(await s.game.getFarm()).size).toBe(0);
    await expect(s.game.place('item-9',1,'room')).rejects.toThrow('already unlocked');
    expect((await s.reload().getFarm()).rooms).toHaveLength(2);
  });
  it('wears GPUs, consumes power, claims mined tokens and spends upkeep tokens',async()=> {
    const s=session();await s.game.place('item-1',0,'gpu',0);s.advance(10_000);
    let farm=await s.game.getFarm();expect(farm.inventory[0].durability).toBeLessThan(100);expect(farm.electricity).toBeLessThan(100);expect(farm.unclaimed).toBeGreaterThan(0);
    const mined=farm.unclaimed;await s.game.claim();farm=await s.game.getFarm();expect(farm.tokens).toBeCloseTo(150+mined);expect(farm.unclaimed).toBe(0);
    await s.game.repair(0);await s.game.payElectricity();await s.game.overclock(0);
    farm=await s.game.getFarm();expect(farm.tokens).toBeCloseTo(150+mined-12-15-25);expect(farm.inventory[0].durability).toBe(100);expect(farm.electricity).toBe(100);expect(totalHashrate(farm)).toBe(12.5);
  });
  it('cannot buy an upgrade without tokens and cannot exceed level three',async()=> {
    const s=session();await s.game.place('item-1',0,'gpu',0);
    await s.game.overclock(0);await s.game.overclock(0);await s.game.overclock(0);
    expect((await s.game.getFarm()).tokens).toBe(0);
    await expect(s.game.overclock(0)).rejects.toThrow('level 3');
    await expect(s.game.lobby()).rejects.toThrow('need 10');
  });
  it('merges exactly three spare matches into next rarity without touching installed cards',async()=> {
    const s=session();await s.fixture(state=>state.inventory.push(makeItem(2),makeItem(3),makeItem(4)));
    await s.game.place('item-1',0,'gpu',0);
    await expect(s.game.merge(['item-1','item-2','item-3'])).rejects.toThrow('spare');
    await expect(s.game.merge(['item-2','item-2','item-3'])).rejects.toThrow('different');
    const upgraded=await s.game.merge(['item-2','item-3','item-4']);
    expect(upgraded.rarity).toBe('Rare');expect((await s.game.getFarm()).tokens).toBe(130);expect((await s.game.getFarm()).inventory).toHaveLength(2);
  });
  it('power exhaustion stops mining and cannot create negative electricity',async()=> {
    const s=session();await s.game.place('item-1',0,'gpu',0);await s.fixture(state=>{state.electricity=.012;});
    s.advance(10_000);const farm=await s.game.getFarm();expect(farm.electricity).toBe(0);expect(totalHashrate(farm)).toBe(0);expect(farm.unclaimed).toBeCloseTo(.1,2);
  });
});

describe('grid event scheduler',()=> {
  it('dispatches every 45 seconds, catches up and never duplicates a tick or reload',async()=> {
    const s=session();s.advance(44_999);expect(await s.game.getGridEvents()).toHaveLength(0);
    s.advance(1);expect(await s.game.getGridEvents()).toHaveLength(1);expect(await s.game.getLetters()).toHaveLength(2);
    expect(await s.game.getGridEvents()).toHaveLength(1);expect(await s.reload().getGridEvents()).toHaveLength(1);
    s.advance(90_000);const events=await s.game.getGridEvents();expect(events).toHaveLength(3);expect(events.map(e=>e.at)).toEqual([235_000,190_000,145_000]);
  });
  it('blackout stops mining only in the affected district and expires',async()=> {
    const s=session();await s.game.place('item-1',0,'gpu',0);
    await s.fixture(state=>state.events=[{id:1,type:'blackout',district:3,at:s.now(),expiresAt:s.now()+20_000,lobbied:false}]);
    expect(totalHashrate(await s.game.getFarm())).toBe(0);s.advance(20_000);expect(totalHashrate(await s.game.getFarm())).toBeGreaterThan(9);
    await s.fixture(state=>state.events=[{id:2,type:'blackout',district:0,at:s.now(),expiresAt:s.now()+20_000,lobbied:false}]);
    expect(totalHashrate(await s.game.getFarm())).toBeGreaterThan(9);
  });
  it('heat halves unprotected farms; Rare cooling protects; surge adds 50%',async()=> {
    const s=session();await s.game.place('item-1',0,'gpu',0);
    await s.fixture(state=>{state.events=[{id:1,type:'heat',district:3,at:s.now(),expiresAt:s.now()+20_000,lobbied:false}];state.inventory.push(makeItem(2,'Cooling','Rare'));});
    expect(totalHashrate(await s.game.getFarm())).toBe(5);await s.game.place('item-2',0,'cooling');expect(totalHashrate(await s.game.getFarm())).toBe(10.5);
    await s.fixture(state=>{state.events[0].type='surge';});expect(totalHashrate(await s.game.getFarm())).toBe(15.75);
  });
  it('lobbying is consumed by exactly the next event and still allows harmful hits',async()=> {
    let hits=0, harmful=0;
    const s=session();
    for(let i=0;i<2000;i++) {
      await s.fixture(state=>{state.tokens=1_000;});await s.game.lobby();
      await expect(s.game.lobby()).rejects.toThrow('already lobbied');
      s.advance(45_000);const farm=await s.game.getFarm();
      expect(farm.lobbied).toBe(false);expect(farm.events[0].lobbied).toBe(true);
      if(['heat','blackout','audit'].includes(farm.events[0].type)) {harmful++;if(farm.events[0].district===3)hits++;}
    }
    expect(hits).toBeGreaterThan(0);expect(hits/harmful).toBeGreaterThan(.035);expect(hits/harmful).toBeLessThan(.1);
  });
  it('bounds offline simulation to two hours and the log to 30 entries',async()=> {
    const s=session();s.advance(365*86400_000);const farm=await s.game.getFarm();
    expect(farm.events).toHaveLength(30);expect(farm.letters).toHaveLength(30);expect(farm.nextEventAt).toBe(s.now()+45_000);
    expect(farm.events[0].at).toBeLessThan(100_000+2*3600_000+1);
  });
});

describe('adapter persistence and recovery',()=> {
  it('can consume a revealed Room key before finishing the pack, then reload the remaining cards',async()=> {
    const s=session();
    await s.fixture(state=>{state.pendingPack={id:'pack-1',cards:[makeItem(8,'Room'),makeItem(9),makeItem(10)],revealed:[false,false,false]};state.nextId=11;state.totalPacks=1;});
    await s.game.reveal('pack-1',0);await s.game.place('item-8',1,'room');
    const farm=await s.reload().getFarm();expect(farm.rooms).toHaveLength(2);expect(farm.pendingPack?.revealed).toEqual([true,false,false]);
    await s.game.reveal('pack-1',1);expect((await s.game.getFarm()).inventory.some(i=>i.id==='item-9')).toBe(true);
  });
  it('saves pack commitment, reveals idempotently, resumes RNG and returns detached state',async()=> {
    const s=session();const p=await s.game.openPack();
    const again=await s.game.openPack();expect(again).toEqual(p);
    await s.game.reveal(p.id,0);await s.game.reveal(p.id,0);expect((await s.game.getFarm()).inventory).toHaveLength(2);
    expect((await s.reload().getFarm()).pendingPack?.revealed).toEqual([true,false,false]);
    await s.game.reveal(p.id,1);await s.game.reveal(p.id,2);
    const saved=await s.game.getFarm();const newPack=await s.game.openPack();
    s.storage.setItem(config.demo.storageKey,JSON.stringify(saved));expect(await s.reload().openPack()).toEqual(newPack);
    const detached=await s.game.getFarm();detached.tokens=-999;expect((await s.game.getFarm()).tokens).toBeGreaterThan(0);
  });
  it('resets deterministic progress and seeded pack sequence',async()=> {
    const s=session();const p=await s.game.openPack();await s.game.reveal(p.id,0);await s.game.reset();
    const farm=await s.game.getFarm();expect(farm.inventory).toHaveLength(1);expect(farm.tokens).toBe(150);expect(farm.events).toHaveLength(0);expect(await s.game.openPack()).toEqual(p);
  });
  it('recovers corrupt or structurally invalid storage',async()=> {
    const s=session();s.storage.setItem(config.demo.storageKey,'{broken');expect((await s.reload().getFarm()).inventory).toHaveLength(1);
    s.storage.setItem(config.demo.storageKey,JSON.stringify({version:1,inventory:[],rng:123}));const farm=await s.reload().getFarm();expect(farm.tokens).toBe(150);expect(farm.storageWarning).toContain('could not be read');
  });
  it('stays playable when storage writes fail',async()=> {
    const adapter=new DemoAdapter({storage:{getItem(){return null;},setItem(){throw new Error('quota');}}});
    const pack=await adapter.openPack();expect(pack.cards).toHaveLength(3);expect((await adapter.getFarm()).storageWarning).toContain('could not be saved');
  });
});
