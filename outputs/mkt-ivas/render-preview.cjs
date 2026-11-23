const {chromium}=require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1119-907-0_26.1119.907.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1080,height:1440},deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(__dirname,'banner.html')).href);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
    const audit=await page.evaluate(()=>({size:[document.body.scrollWidth,document.body.scrollHeight],images:[...document.images].map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight})),overflow:[...document.querySelectorAll('h1,h2,.place,.contact-value')].filter(e=>e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,text:e.textContent}))}));
    await page.screenshot({path:path.join(__dirname,'banner.png'),fullPage:false});
    console.log(JSON.stringify(audit));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
