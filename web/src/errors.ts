import { BaseError, ContractFunctionRevertedError, decodeErrorResult, type Abi, type Hex } from 'viem';
import abis from './abi.json';
export type ErrorContext = { action?: string; contract?: string; reason?: string };
export function contractErrorName(error: unknown): string | undefined {
 if(error instanceof BaseError){const r=error.walk(e=>e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError;if(r?.data?.errorName)return r.data.errorName;}
 const queue:unknown[]=[error],seen=new Set<unknown>();
 for(let depth=0;queue.length&&depth<50;depth++){
  const item=queue.shift();if(!item||seen.has(item))continue;seen.add(item);
  if(typeof item==='string'&&/^0x[0-9a-fA-F]{8,}$/.test(item)){
   try{return decodeErrorResult({abi:Object.values(abis).flat() as Abi,data:item as Hex}).errorName;}catch{/* Not ABI revert bytes. */}
  }else if(typeof item==='object'){
   const v=item as Record<string,unknown>;
   if(typeof v.errorName==='string')return v.errorName;
   for(const key of ['data','raw','cause','error','originalError'])if(v[key])queue.push(v[key]);
  }
 }
}
const actionHints:Record<string,string>={
 place:'This hardware cannot go in that slot. Check its level, room type limit and whether the slot is still empty.',
 unplace:'That slot no longer contains this hardware. Refresh your farm.',
 buyRoom:'This room needs the displayed farm age or level, and must not already be owned.',
 buyWithETH:'The pack price changed beyond your protection. Refresh the price and review the purchase again.',
 openPack:'Choose 1–10 packs and check that the sale is open.',
 resolve:'This pack is not ready to open, or was already opened. Refresh your packs.',
 claim:'The reward amount changed. Refresh your rewards before claiming.',
 claimFree:'This legacy receipt has already been claimed or its window has closed.',
 repair:'This hardware is unavailable for repair. Refresh its ownership and health.',
 scrap:'Remove the item first. Legacy hardware also needs one paid pack before scrapping.',
 lock:'Choose an available lock term and meet the displayed minimum amount.',
 unlock:'Your locked tokens are not ready to withdraw yet.',
 sync:'Your farm cannot be updated yet. Check that mining has started and refresh the farm.',
};
export const ERROR_COPY:Record<string,string>={
 InvalidValue:'The action no longer meets the game requirements. Refresh its details and try again.',
 TooEarly:'This action is not open yet. Check its countdown before trying again.',
 InsufficientBalance:'There is not enough available balance for this action.',
 FeatureDisabled:'The city has not enabled this feature yet. Check back when it opens.',
 NotConfigured:'The game is not ready for this action yet. No purchase was made.',
 PriceLimitedBuy:'The market price moved outside this purchase’s allowed range. Refresh the ETH quote.',
 PartialFill:'The market cannot supply the full purchase right now. Try fewer packs or wait for more liquidity.',
 InvalidProof:'This wallet is not eligible for this claim. Reconnect the eligible wallet.',
 AlreadyDone:'This action is already complete. Refresh to see the result.',AlreadyConsumed:'This authorization was already used. Request a new one.',
 CatchUpRequired:'Your farm has several completed epochs to collect. Sync the farm, then try again.',
 Unauthorized:'This wallet is not allowed to perform this action.',InvalidAddress:'The recipient is not valid for this action.',
 ERC20InsufficientBalance:'Your BLACKOUT balance is too low. Add tokens or choose Buy pack with ETH.',
 ERC20InsufficientAllowance:'Approve the displayed BLACKOUT amount before paying with tokens.',
 AddressInsufficientBalance:'Your ETH balance is too low to cover this action and network fees.',
 ERC1155InsufficientBalance:'This wallet no longer holds the selected hardware. Refresh your farm.',
 ERC1155MissingApprovalForAll:'The hardware transfer needs your wallet’s permission first.',
 ERC1155InvalidArrayLength:'The hardware selection is incomplete. Refresh and select the items again.',
 SafeERC20FailedOperation:'The token transfer could not finish. Check your balance and permission, then retry.',
 FailedInnerCall:'A required game operation could not finish. Refresh this action before retrying.',
 TransferFailed:'The payment could not be transferred. Check the receiving wallet and try again.',
 AddressEmptyCode:'A required game contract is unavailable. Try again after the connection recovers.',
 ReentrancyGuardReentrantCall:'Another game operation is still running. Wait for it to finish.',
 MathOverflowedMulDiv:'This amount is too large to calculate. Choose a smaller amount.',
 AttestationExpired:'This signed result has expired. Request a fresh result.',AttestationNotYetValid:'This signed result is not valid yet. Wait for its opening time.',
 BadSignature:'The signature could not be verified. Request a fresh signature.',ZeroSigner:'The game has no valid signer configured for this action.',
 WrongAnswerType:'The signed result has the wrong format. Request a fresh result.',
 InvalidShortString:'This text is not valid. Shorten it and use the permitted characters.',StringTooLong:'This text is too long. Shorten it before submitting.',
 StringsInsufficientHexLength:'This identifier has an invalid length. Refresh the action details.',
};
for(const name of ['ERC1155InvalidApprover','ERC1155InvalidOperator','ERC1155InvalidReceiver','ERC1155InvalidSender','ERC20InvalidApprover','ERC20InvalidReceiver','ERC20InvalidSender','ERC20InvalidSpender'])ERROR_COPY[name]='This wallet cannot send or receive this asset for the selected action. Check the connected wallet.';
export function errorMessage(error:unknown,context:ErrorContext={}):string {
 const e=error as {code?:number;message?:string};
 if(e?.code===4001||/user rejected|user denied/i.test(e?.message||'')||(error instanceof BaseError&&error.walk(v=>typeof v==='object'&&v!==null&&'code' in v&&v.code===4001)))return 'Request rejected in wallet. No further transaction was sent.';
 const name=contractErrorName(error);
 if(name){
  if(context.reason&&['InvalidValue','TooEarly','InsufficientBalance'].includes(name))return context.reason;
  if(name==='NotConfigured'&&['resolve','captureEntropy'].includes(context.action||''))return 'The pack’s reveal seed is not available yet. Wait for the reveal block; an expired window can be re-armed here.';
  if(name==='NotConfigured'&&context.action==='claimFree')return 'This legacy claim is unavailable.';
  if(name==='NotConfigured'&&['buyWithETH','openPack'].includes(context.action||''))return 'Pack sales are waiting for game setup and reward funding to finish. Check the sale status before trying again.';
  if(name==='TooEarly'&&context.contract==='FarmCore')return 'Your farm cannot change while the mining epoch is closed. Wait for the next epoch to open, then refresh.';
  if(name==='InsufficientBalance'&&context.action==='scrap')return 'The scrap payout is below the minimum you reviewed. Refresh the item’s scrap value and try again.';
  if(name==='InvalidValue'&&context.contract==='StarterClaim'&&context.action==='claim')return 'This legacy claim is not valid for the selected snapshot token. Refresh your receipts.';
  if(name==='InsufficientBalance'&&context.action==='buyWithETH')return 'The swap returned too little BLACKOUT for the pack price. Refresh the ETH quote and try again.';
  if(name==='TooEarly'&&context.action==='claimFree')return 'This legacy claim window is closed.';
  if(name==='TooEarly'&&context.action==='unlock')return 'Your lock term has not ended. Wait for the displayed unlock time.';
  if(name==='FeatureDisabled'&&['lock','lobby','bidBillboard'].includes(context.action||''))return `${context.action==='lock'?'District staking':context.action==='lobby'?'District lobbying':'Billboard bidding'} has not been enabled by the city yet.`;
  if(name==='InvalidValue'&&context.action&&actionHints[context.action])return actionHints[context.action];
  if(name==='InsufficientBalance'&&['resolve','captureEntropy'].includes(context.action||''))return 'Make room for 3 items in your inventory before opening this pack.';
  if(name==='InsufficientBalance'&&context.action==='claim')return 'Your available rewards are below this claim amount. Sync your farm and refresh.';
  if(name==='TooEarly'&&['resolve','captureEntropy'].includes(context.action||''))return 'Your pack is waiting for the next reveal block. Leave it here and try again when Reveal appears.';
  return ERROR_COPY[name]||'The game could not complete this action. Refresh its details and retry.';
 }
 const message=e?.message||'';
 if(/http|fetch|network|timeout|timed out|rpc|request failed|socket|429|503|execution reverted|contract function|returned no data/i.test(message))return 'Reconnecting to the city. Your last update is still here; try again shortly.';
 if(error instanceof Error&&!(error instanceof BaseError)&&message.length<400&&!/0x[0-9a-f]{40}|\n|https?:/i.test(message))return message;
 return 'Unable to complete this action. Refresh and try again.';
}
