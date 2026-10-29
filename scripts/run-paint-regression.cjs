const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(String(error.stack||error)));
    await page.goto('http://127.0.0.1:8765/paint-regression.html',{waitUntil:'load'});
    await page.getByRole('button',{name:'Run regression tests'}).click();
    await page.waitForFunction(()=>window.paintRegressionResult?.done,{},{timeout:180000});
    const result=await page.evaluate(()=>window.paintRegressionResult);
    result.pageErrors=errors;fs.mkdirSync('test-results',{recursive:true});
    fs.writeFileSync('test-results/paint-regression.json',JSON.stringify(result,null,2));
    await page.screenshot({path:'test-results/paint-regression.png',fullPage:true});
    console.log(JSON.stringify(result,null,2));
    if(!result.passed||errors.length)process.exitCode=1;
  }catch(error){console.error(error);process.exitCode=1;}
  finally{await browser.close();}
})();
