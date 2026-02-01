#!/usr/bin/env node
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

(async () => {
  try {
    // Get the XML directly using ADB
    console.log('Getting UI XML from device...');
    await execAsync('adb -s emulator-5554 shell "uiautomator dump /sdcard/dump.xml"');
    const { stdout } = await execAsync('adb -s emulator-5554 shell "cat /sdcard/dump.xml"');
    
    console.log('XML length:', stdout.length);
    
    // Find elements with text
    const textRegex = /text="([^"]*)"/g;
    let match;
    const texts = [];
    while ((match = textRegex.exec(stdout)) !== null) {
      if (match[1]) {  // Non-empty
        texts.push(match[1]);
      }
    }
    
    console.log('\nFound', texts.length, 'elements with text');
    console.log('\nFirst 15 text values:');
    texts.slice(0, 15).forEach((t, i) => console.log(`  ${i+1}. "${t}"`));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
