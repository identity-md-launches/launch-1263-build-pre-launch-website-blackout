export const TEAM_WALLET = '0x6d51cBE774aeAe4dd40bCA2560E9bc2695A0d007';
export const isTeam = (address: string) => address.toLowerCase() === TEAM_WALLET.toLowerCase();
export const farmName = (address: string) => isTeam(address) ? 'Team farm' : `${address.slice(0,6)}…${address.slice(-4)}`;
