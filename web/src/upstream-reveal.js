/* Dependency-free one-click receipt reveal for an EIP-1193 provider.
   Call from a single Reveal button; retain the returned promise and display onStatus.
   The wallet may ask for more than one transaction if entropy expired. */
export async function revealReceipt({provider, contract, receipt, count = 1, starter = false, captured = false, onStatus = (_status) => {}, pollMs = 2000}) {
  const accounts = await provider.request({method: 'eth_requestAccounts'});
  const from = accounts[0];
  const word = n => BigInt(n).toString(16).padStart(64, '0');
  const call = data => provider.request({method: 'eth_call', params: [{to: contract, data}, 'latest']});
  const decode = data => (data.slice(2).match(/.{64}/g) || []).map(x => BigInt('0x' + x));
  const pause = () => new Promise(resolve => setTimeout(resolve, pollMs));
  const chain = Number(BigInt(await provider.request({method: 'eth_chainId'})));
  const nativeBlock = async () => [4663, 46630].includes(chain)
    ? BigInt(await provider.request({method: 'eth_call', params: [{to: '0x0000000000000000000000000000000000000064', data: '0xa3b1b31d'}, 'latest']}))
    : BigInt(await provider.request({method: 'eth_blockNumber'}));
  let wanted;
  let rearming = false;
  for (;;) {
    const state = decode(await call('0x' + (starter ? 'a888c2cd' : 'c7c4a615') + word(receipt)));
    if (!state[0]) throw new Error('Unknown receipt');
    if (starter ? state[2] !== 0n : state[3] >= state[2] || wanted !== undefined && state[3] >= wanted) return wanted === undefined ? 'already-opened' : 'opened';
    if (!starter && wanted === undefined) {
      if (!Number.isInteger(count) || count < 1 || count > 8 || BigInt(count) > state[2] - state[3]) throw new Error('Invalid remaining pack count');
      wanted = state[3] + BigInt(count);
    }
    const current = await nativeBlock();
    if (current <= state[1]) { onStatus(`The city is rolling the dice · ${state[1] - current + 1n} native blocks until entropy`); await pause(); continue; }
    if (current > state[1] + 256n && !(starter ? captured : state[7])) rearming = true;
    onStatus(rearming ? 'Re-arming, wait a moment' : 'Revealing...');
    const data = '0x' + (starter ? '4f896d4f' : 'd1691a6f') + word(receipt) + (starter ? '' : word(wanted - state[3]));
    const hash = await provider.request({method: 'eth_sendTransaction', params: [{from, to: contract, data}]});
    onStatus(rearming ? 'Re-arming, wait a moment' : 'Revealing...');
    let mined;
    do { await pause(); mined = await provider.request({method: 'eth_getTransactionReceipt', params: [hash]}); } while (!mined);
    if (BigInt(mined.status) !== 1n) throw new Error('Reveal failed; receipt remains claimable. Check inventory capacity.');
    onStatus(rearming ? 'Re-arming, wait a moment' : 'Revealing...');
  }
}
