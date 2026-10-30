// Isolated EIP-6963 and JSON-RPC fixtures. Never signs or sends a real transaction.
import { chromium, webkit, devices } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { multicall3Abi, parseAbi, encodeFunctionResult, decodeFunctionData, encodeAbiParameters, encodeEventTopics, parseEther, keccak256, stringToHex, getAddress } from 'viem';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
const exportRoot=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!route.startsWith('/preview/')){res.writeHead(404).end();return;}
  const file=resolve(exportRoot,route.slice('/preview/'.length)||'index.html');
  if(!file.startsWith(exportRoot+sep)){res.writeHead(403).end();return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}).end(await readFile(file));
 }catch{res.writeHead(404).end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url=`http://127.0.0.1:${server.address().port}/preview/`;
const OUT='test/scratch/browser-results';
await mkdir(OUT,{recursive:true});
const abi=parseAbi(['function tip(string message) payable','function getTips() view returns ((address tipper,uint256 amount,string message,uint256 timestamp)[])','function getLeaderboard() view returns (address[10])','function totalTipped(address) view returns (uint256)','event Tipped(address indexed tipper,uint256 amount,string message)']);
const contract='0x20D901D65c3801774FBeb147A1D04818584C9d2c';
const account=getAddress('0x'+keccak256(stringToHex('isolated browser fixture account')).slice(-40));
const txHash=keccak256(stringToHex('isolated browser fixture transaction'));
const blockHash=keccak256(stringToHex('isolated browser fixture block'));
const ZERO='0x'+'0'.repeat(40);
const icon='data:image/svg+xml;base64,'+(await readFile('public/favicon.svg')).toString('base64');
const results=[];
function passed(name, extra={}){results.push({name,passed:true,...extra});console.log('PASS',name);}
async function setup(browser,{wallet=false,populated=false,viewport={width:390,height:844},mobile=false}={}){
 const context=await browser.newContext(mobile?{...devices['iPhone 13'],viewport}:{viewport});
 const state={block:4096,unavailable:false,receipt:'pending',tx:null,recorded:false,reads:0,requests:[],tips:populated?Array.from({length:7},(_,i)=>({tipper:account,amount:parseEther('0.001'),message:i===0?'<img src=x onerror=alert(1)>':i===1?'LongUnbrokenMessage'.repeat(7):`Fixture message ${i+1}`,timestamp:1760000000n+BigInt(i)})):[]};
 await context.route(/https:\/\/(ethereum-sepolia-rpc\.publicnode\.com|rpc\.sepolia\.org)/,async route=>{
  if(state.unavailable){await route.fulfill({status:503,body:'Temporarily unavailable'});return;}
  const payload=route.request().postDataJSON();
  const answer=item=>{
   state.requests.push(item.method);
   let result;
   const receipt={transactionHash:txHash,transactionIndex:'0x0',blockHash,blockNumber:'0x1000',from:account,to:contract,cumulativeGasUsed:'0x10000',gasUsed:'0x10000',effectiveGasPrice:'0x3b9aca00',contractAddress:null,type:'0x2',logsBloom:'0x'+'0'.repeat(512),status:state.receipt==='reverted'?'0x0':'0x1',logs:[]};
   if(state.tx){const decoded=decodeFunctionData({abi,data:state.tx.data});receipt.logs=[{address:contract,blockHash,blockNumber:'0x1000',transactionHash:txHash,transactionIndex:'0x0',logIndex:'0x0',removed:false,data:encodeAbiParameters([{type:'uint256'},{type:'string'}],[BigInt(state.tx.value),decoded.args[0]]),topics:encodeEventTopics({abi,eventName:'Tipped',args:{tipper:account}})}];}
   if(item.method==='eth_chainId')result='0xaa36a7';
   else if(item.method==='eth_blockNumber')result='0x'+(state.block++).toString(16);
   else if(item.method==='eth_getBalance')result='0xde0b6b3a7640000';
   else if(item.method==='eth_getCode')result='0x60806040';
   else if(item.method==='eth_gasPrice'||item.method==='eth_maxPriorityFeePerGas')result='0x3b9aca00';
   else if(item.method==='eth_estimateGas')result='0x186a0';
   else if(item.method==='eth_getTransactionCount')result='0x1';
   else if(item.method==='eth_call'){
    state.reads++;
    if(item.params[0].data.startsWith('0x82ad56cb')) {
     const mc=decodeFunctionData({abi:multicall3Abi,data:item.params[0].data});
     return {jsonrpc:'2.0',id:item.id,result:encodeFunctionResult({abi:multicall3Abi,functionName:'aggregate3',result:mc.args[0].map(()=>({success:true,returnData:encodeAbiParameters([{type:'uint256'}],[parseEther('1')])}))})};
    }
    const call=decodeFunctionData({abi,data:item.params[0].data});
    if(call.functionName==='getTips')result=encodeFunctionResult({abi,functionName:'getTips',result:state.tips});
    if(call.functionName==='getLeaderboard')result=encodeFunctionResult({abi,functionName:'getLeaderboard',result:state.tips.length?[account,...Array(9).fill(ZERO)]:Array(10).fill(ZERO)});
    if(call.functionName==='totalTipped')result=encodeFunctionResult({abi,functionName:'totalTipped',result:state.tips.reduce((sum,tip)=>sum+tip.amount,0n)});
    if(call.functionName==='tip')result='0x';
   }
   else if(item.method==='eth_getTransactionReceipt'){
    result=state.receipt==='pending'?null:receipt;
    if(result&&state.receipt==='success'&&state.tx&&!state.recorded){const decoded=decodeFunctionData({abi,data:state.tx.data});state.tips.push({tipper:account,amount:BigInt(state.tx.value),message:decoded.args[0],timestamp:1760000100n});state.recorded=true;}
   }
   else if(item.method==='eth_getTransactionByHash')result={...state.tx,hash:txHash,nonce:'0x0',from:account,to:contract,input:state.tx?.data??'0x',value:state.tx?.value??'0x0',gas:'0x186a0',gasPrice:'0x3b9aca00',type:'0x2',chainId:'0xaa36a7',maxFeePerGas:'0x77359400',maxPriorityFeePerGas:'0x3b9aca00',blockNumber:null,blockHash:null,transactionIndex:null};
   else if(item.method==='eth_getBlockByNumber')result={number:'0x1000',hash:blockHash,parentHash:blockHash,nonce:'0x0000000000000000',sha3Uncles:blockHash,logsBloom:'0x'+'0'.repeat(512),transactionsRoot:blockHash,stateRoot:blockHash,receiptsRoot:blockHash,miner:account,difficulty:'0x0',totalDifficulty:'0x0',extraData:'0x',size:'0x0',gasLimit:'0x1c9c380',gasUsed:'0x10000',timestamp:'0x68e77800',transactions:[],uncles:[],baseFeePerGas:'0x3b9aca00'};
   else throw Error(`Unhandled RPC ${item.method}`);
   return {jsonrpc:'2.0',id:item.id,result};
  };
  try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Array.isArray(payload)?payload.map(answer):answer(payload))});}catch(e){console.error(e);await route.fulfill({status:500,body:String(e)});}
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const failedLocal=[];page.on('response',res=>{if(res.url().startsWith(url)&&res.status()>=400)failedLocal.push(res.url());});
 if(wallet){
  await page.exposeFunction('recordFixtureTransaction',tx=>{state.tx=tx;});
  await page.addInitScript(({account,txHash,icon})=>{
   const listeners={};
   const fixture=window.__wallet={chain:'0xaa36a7',connected:sessionStorage.getItem('fixture-connected')==='yes',rejectConnect:false,rejectSign:false,unknownChain:false,calls:[],emit:(event,value)=>(listeners[event]??[]).forEach(fn=>fn(value))};
   const provider={on:(event,fn)=>{(listeners[event]??=[]).push(fn);},removeListener:(event,fn)=>{listeners[event]=(listeners[event]??[]).filter(x=>x!==fn);},request:async({method,params})=>{
    fixture.calls.push({method,params});
    if(method==='eth_chainId')return fixture.chain;
    if(method==='eth_accounts')return fixture.connected?[account]:[];
    if(method==='eth_requestAccounts'){
     if(fixture.rejectConnect){const e=new Error('User rejected request');e.code=4001;throw e;}
     fixture.connected=true;sessionStorage.setItem('fixture-connected','yes');return [account];
    }
    if(method==='wallet_getPermissions'||method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];
    if(method==='wallet_switchEthereumChain'){
     if(fixture.unknownChain){fixture.unknownChain=false;const e=new Error('Unknown chain');e.code=4902;throw e;}
     fixture.chain=params[0].chainId;fixture.emit('chainChanged',fixture.chain);return null;
    }
    if(method==='wallet_addEthereumChain'){fixture.chain=params[0].chainId;fixture.emit('chainChanged',fixture.chain);return null;}
    if(method==='wallet_revokePermissions'){fixture.connected=false;sessionStorage.removeItem('fixture-connected');return null;}
    if(method==='eth_sendTransaction'){
     if(fixture.rejectSign){const e=new Error('User rejected request');e.code=4001;throw e;}
     await window.recordFixtureTransaction(params[0]);return txHash;
    }
    throw new Error(`Unhandled wallet ${method}`);
   }};
   window.ethereum=provider;
   const announcement={info:{uuid:crypto.randomUUID(),name:'HamsterTip Test Wallet',icon,rdns:'test.hamstertip.browser'},provider};
   const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:announcement}));
   window.addEventListener('eip6963:requestProvider',announce);announce();
  },{account,txHash,icon});
 }
 await page.goto(url);
 await page.getByRole('heading',{name:'Tip ETH. Spread the squeek.'}).waitFor();
 await page.getByText(/Synced at/).waitFor();
 return {context,page,state,errors,failedLocal};
}
async function waitText(page,text){await page.getByText(text,{exact:false}).first().waitFor({timeout:15000});}
async function connect(page){await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('button',{name:'HamsterTip Test Wallet',exact:true}).click();await page.getByRole('dialog',{name:'Connect a wallet',exact:true}).waitFor({state:'hidden'});}

for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]].filter(([name])=>!process.argv.some(arg=>arg.startsWith('--browser='))||process.argv.includes(`--browser=${name.toLowerCase()}`))){
 let browser;
 try{browser=await engine.launch({headless:true});}catch(error){results.push({name:`${name} launch`,passed:false,limitation:error.message});console.error(name,error.message);continue;}
 try{
  const {context,page,state,errors,failedLocal}=await setup(browser,{wallet:true});
  // Preserve a clean screenshot before any fixture wallet is connected.
  await page.screenshot({path:`${OUT}/${name.toLowerCase()}-first-screen.png`});
  await page.getByRole('button',{name:'0.005',exact:true}).click();assert.equal(await page.locator('#amount').inputValue(),'0.005');
  await page.getByRole('button',{name:'Custom',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'amount');
  await page.locator('#amount').fill('0');await page.getByRole('button',{name:'Send a tip',exact:true}).click();await waitText(page,'Enter an amount greater than 0 ETH.');assert.equal(await page.evaluate(()=>document.activeElement.id),'amount');
  await page.locator('#amount').fill('0.001');await page.locator('#message').fill('🐹'.repeat(36));await page.getByRole('button',{name:'Send a tip',exact:true}).click();await waitText(page,'Shorten your message by 4 bytes.');assert.equal(await page.evaluate(()=>document.activeElement.id),'message');
  await page.locator('#message').fill('Thanks for the squeeks!');
  passed(`${name}: presets, custom focus, zero amount, UTF-8 message validation`);
  await page.getByRole('button',{name:'Send a tip',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Connect a wallet',exact:true});await modal.waitFor();
  assert.equal(await modal.getByRole('button',{name:'Browser wallet',exact:true}).count(),0);
  assert.equal(await modal.getByRole('button',{name:'HamsterTip Test Wallet',exact:true}).count(),1);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('dialog')?.open) || document.activeElement===document.body),true);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('dialog')?.open) || document.activeElement===document.body),true);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Send a tip');
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.evaluate(()=>{window.__wallet.rejectConnect=true;});await page.getByRole('button',{name:'HamsterTip Test Wallet',exact:true}).click();await waitText(page,'Request declined in your wallet.');
  await page.evaluate(()=>{window.__wallet.rejectConnect=false;});await page.getByRole('button',{name:'HamsterTip Test Wallet',exact:true}).click();await modal.waitFor({state:'hidden'});
  passed(`${name}: named EIP-6963 discovery, connection rejection/retry, modal keyboard and focus return`);
  await page.evaluate(()=>{window.__wallet.chain='0x1';window.__wallet.unknownChain=true;window.__wallet.emit('chainChanged','0x1');});
  await page.getByRole('button',{name:'Switch to Sepolia',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Review tip',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Switch to Sepolia',exact:true}).click();await page.getByRole('button',{name:'Review tip',exact:true}).waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:'Review tip',exact:true}).isDisabled(),false);
  const add=await page.evaluate(()=>window.__wallet.calls.find(c=>c.method==='wallet_addEthereumChain'));assert.equal(add.params[0].chainId,'0xaa36a7');
  passed(`${name}: wrong-chain guard, switch-chain and add-chain fallback`);
  await page.locator('#amount').fill('0.005');
  await page.getByRole('button',{name:'Review tip',exact:true}).click();
  const review=page.getByRole('dialog',{name:'Review your tip',exact:true});await review.waitFor();await review.getByText(contract).waitFor();
  assert.equal(await review.getByText('Ethereum Sepolia',{exact:true}).count(),1);
  await page.evaluate(()=>{window.__wallet.rejectSign=true;});await review.getByRole('button',{name:'Confirm 0.005 ETH tip',exact:true}).click();await waitText(page,'Request declined in your wallet.');
  assert.equal(await page.locator('#message').inputValue(),'Thanks for the squeeks!');
  passed(`${name}: review shows contract/network/amount, rejected signing retains draft`);
  await page.evaluate(()=>{window.__wallet.rejectSign=false;});
  await page.getByRole('button',{name:'Review tip',exact:true}).click();await review.getByRole('button',{name:'Confirm 0.005 ETH tip',exact:true}).click();await waitText(page,'Your tip is on its way.');
  assert.equal(await page.getByRole('button',{name:'Waiting for confirmation…',exact:true}).isDisabled(),true);
  assert.equal(state.tx.to.toLowerCase(),contract.toLowerCase());assert.equal(BigInt(state.tx.value),parseEther('0.005'));
  const decoded=decodeFunctionData({abi,data:state.tx.data});assert.equal(decoded.functionName,'tip');assert.equal(decoded.args[0],'Thanks for the squeeks!');
  await page.reload();await waitText(page,'Your tip is on its way.');assert.equal(await page.locator('#amount').inputValue(),'0.005');assert.equal(await page.locator('#message').inputValue(),'Thanks for the squeeks!');
  state.receipt='success';await waitText(page,'A little love, recorded forever.');await waitText(page,'Your 0.005 ETH tip is confirmed.');
  await page.locator('.leader-list li').first().waitFor();assert.equal(await page.locator('.leader-list li').count(),1);assert.equal(await page.locator('.tip-list li').count(),1);
  passed(`${name}: transaction payload, disabled pending state, reload recovery, confirmed event and refreshed leaderboard`);
  await page.getByRole('button',{name:'Send another tip',exact:true}).click();assert.equal(await page.locator('#message').inputValue(),'');
  state.receipt='reverted';state.recorded=false;
  await page.getByRole('button',{name:'Review tip',exact:true}).click();await review.getByRole('button',{name:'Confirm 0.005 ETH tip',exact:true}).click();await waitText(page,'The transaction reverted.');
  passed(`${name}: on-chain revert is never reported as success`);
  assert.deepEqual(errors,[]);assert.deepEqual(failedLocal,[]);
  passed(`${name}: no runtime exceptions or missing local resources`);
  await context.close();
  const mobile=await setup(browser,{mobile:true});
  await mobile.page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  for(const wallet of ['MetaMask','Coinbase Wallet','Rabby','Phantom'])assert.equal(await mobile.page.getByRole('link',{name:`Open in ${wallet}`,exact:true}).count(),1);
  assert.equal(await mobile.page.getByRole('button',{name:'Coinbase Smart Wallet',exact:true}).count(),1);
  const links=await mobile.page.locator('.wallet-row[href]').evaluateAll(els=>els.map(el=>el.href));
  assert.ok(links.every(link=>link.includes(String(server.address().port))));
  const box=await mobile.page.locator('dialog[open]').boundingBox();assert.equal(Math.round(box.y+box.height),844);
  await mobile.page.screenshot({path:`${OUT}/${name.toLowerCase()}-mobile-wallet.png`});
  const walletAudit=await new AxeBuilder({page:mobile.page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(walletAudit.violations.map(v=>v.id),[]);
  passed(`${name}: four mobile deep links, Coinbase Smart Wallet, bottom sheet and automated modal accessibility`);
  await mobile.context.close();
  const populated=await setup(browser,{populated:true,viewport:{width:1440,height:1000}});
  assert.equal(await populated.page.locator('.tip-list li').count(),5);await populated.page.getByRole('button',{name:'Show more tips'}).click();assert.equal(await populated.page.locator('.tip-list li').count(),7);
  await populated.page.getByText('<img src=x onerror=alert(1)>',{exact:true}).waitFor();assert.equal(await populated.page.locator('.tip-message img').count(),0);
  await populated.page.getByRole('button',{name:'My tips',exact:true}).click();await waitText(populated.page,'Your kindness lives here.');
  await populated.page.getByRole('button',{name:'All tips',exact:true}).click();assert.equal(await populated.page.locator('.tip-list li').count(),5);
  for(const width of [320,390,768,1060,1440]){
   await populated.page.setViewportSize({width,height:844});
   assert.equal(await populated.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} overflow at ${width}`);
  }
  await populated.page.setViewportSize({width:390,height:844});
  const audit=await new AxeBuilder({page:populated.page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await writeFile(`${OUT}/${name.toLowerCase()}-axe.json`,JSON.stringify({violations:audit.violations,passes:audit.passes.length},null,2));
  assert.deepEqual(audit.violations.map(v=>v.id),[]);
  passed(`${name}: populated messages, escaping, pagination, filters, five-width reflow and automated accessibility`,{axePasses:audit.passes.length});
  await populated.context.close();
  const offline=await setup(browser);
  offline.state.unavailable=true;
  await offline.page.getByRole('button',{name:'Refresh community data',exact:true}).click();
  await waitText(offline.page,'The latest update could not load.');
  assert.equal(await offline.page.locator('.stat dd').nth(1).textContent(),'0');
  offline.state.unavailable=false;
  await offline.page.getByRole('button',{name:'Try again',exact:true}).click();
  await waitText(offline.page,'Synced at');
  offline.state.unavailable=true;
  await offline.page.reload();await waitText(offline.page,'Could not load tips from Sepolia.');
  assert.equal(await offline.page.locator('.stat dd').nth(1).textContent(),'Unavailable');
  assert.equal(await offline.page.getByText('The first spot could be yours.',{exact:true}).count(),0);
  await offline.page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await offline.page.getByRole('button',{name:'Browser wallet',exact:true}).click();
  await waitText(offline.page,'No browser wallet found.');
  await offline.page.keyboard.press('Escape');
  offline.state.unavailable=false;
  await offline.page.getByRole('button',{name:'Try again',exact:true}).click();await waitText(offline.page,'Synced at');
  await offline.page.getByRole('button',{name:'How it works',exact:true}).last().click();
  await offline.page.getByRole('dialog',{name:'A little guide to tipping',exact:true}).waitFor();
  await offline.page.keyboard.press('Escape');
  await offline.page.emulateMedia({reducedMotion:'reduce'});
  await offline.page.waitForFunction(()=>document.getAnimations().filter(a=>a.playState==='running').length===0, null, {timeout:2000});
  await offline.page.setViewportSize({width:768,height:1024});
  await offline.page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert.equal(await offline.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  passed(`${name}: offline/stale/initial-failure/retry states, no-extension feedback, help, reduced motion and 200% text resize`);
  await offline.context.close();
 }catch(error){results.push({name:`${name} interaction validation`,passed:false,error:error.stack});console.error(error.stack);}
 finally{await browser.close();}
}
await writeFile(`${OUT}/results.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;

server.closeAllConnections();
await new Promise(done=>server.close(done));
