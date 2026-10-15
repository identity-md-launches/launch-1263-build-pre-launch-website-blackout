import {readFileSync,writeFileSync} from 'node:fs';
import {landing} from '../../src/landing';
import {header} from '../src/shell';
import {requireTool} from './deps.mjs';
// Keep the first screen in the HTML so the product and links render even while
// the game and wallet modules are downloading. No chain values are baked in.
const hero=landing().split(' <section id="home-live"')[0];
const css=readFileSync('web/src/critical.css','utf8').replaceAll("url('/assets/","url('./assets/");
const critical=`<!-- BLACKOUT_CRITICAL_START --><style>${requireTool('esbuild').transformSync(css,{loader:'css',minify:true}).code}</style><!-- BLACKOUT_CRITICAL_END -->`;
const original=readFileSync('index.html','utf8');
const html=original.includes('<!-- BLACKOUT_CRITICAL_START -->')?original.replace(/<!-- BLACKOUT_CRITICAL_START -->[\s\S]*?<!-- BLACKOUT_CRITICAL_END -->/,critical):original.replace('</head>',critical+'\n</head>');
const shell=`<!-- BLACKOUT_SHELL_START -->${header()}<main id="main" tabindex="-1">${hero}</main><!-- BLACKOUT_SHELL_END -->`;
writeFileSync('index.html',html.includes('<!-- BLACKOUT_SHELL_START -->')?html.replace(/<!-- BLACKOUT_SHELL_START -->[\s\S]*?<!-- BLACKOUT_SHELL_END -->/,shell):html.replace('<div id="app"></div>',`<div id="app">${shell}</div>`));
