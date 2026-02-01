const driver = require('./src/appiumClient.js');
const fs = require('fs');

(async () => {
  try {
    const d = await driver.getDriver();
    const xml = await d.getPageSource();
    fs.writeFileSync('/tmp/android_snapshot.xml', xml);
    console.log('XML saved to /tmp/android_snapshot.xml');
    console.log('Size:', xml.length, 'bytes');
    
    // Count elements with text
    const textMatches = xml.match(/text="([^"]*)"/g) || [];
    const nonEmpty = textMatches.filter(m => !m.match(/text=""/));
    console.log('Elements with text:', textMatches.length);
    console.log('Elements with non-empty text:', nonEmpty.length);
    
    // Show some examples
    console.log('\nFirst 10 elements with text:');
    nonEmpty.slice(0, 10).forEach(t => console.log('  -', t));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
