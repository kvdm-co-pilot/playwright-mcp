// Test the parser with sample Android XML
const sampleXML = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy index="0" class="hierarchy" rotation="0" width="1080" height="2400">
  <android.widget.FrameLayout index="0" package="com.android.settings" class="android.widget.FrameLayout" text="" clickable="false" enabled="true" displayed="true" bounds="[0,0][1080,2400]">
    <android.widget.LinearLayout index="0" class="android.widget.LinearLayout" text="" clickable="true" enabled="true" focusable="true" displayed="true" bounds="[0,100][1080,200]">
      <android.widget.TextView index="0" class="android.widget.TextView" text="Network & internet" resource-id="android:id/title" clickable="false" enabled="true" displayed="true" bounds="[0,100][1080,200]" />
    </android.widget.LinearLayout>
    <android.widget.LinearLayout index="1" class="android.widget.LinearLayout" text="" clickable="true" enabled="true" focusable="true" displayed="true" bounds="[0,200][1080,300]">
      <android.widget.TextView index="0" class="android.widget.TextView" text="Connected devices" resource-id="android:id/title" clickable="false" enabled="true" displayed="true" bounds="[0,200][1080,300]" />
    </android.widget.LinearLayout>
  </android.widget.FrameLayout>
</hierarchy>`;

// Simulated parsing logic
function parseUI(xmlString) {
  const elements = [];
  const nodeRegex = /<(android\.[^\s>]+|node)\s+([^>\/]*)(\/>|>)/g;
  const matches = xmlString.matchAll(nodeRegex);
  
  for (const match of matches) {
    const tagName = match[1];
    const attrs = match[2];
    
    const getText = (attr) => {
      const m = attrs.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
      return m ? m[1].trim() : '';
    };
    
    const text = getText('text');
    const resourceId = getText('resource-id');
    const className = (getText('class') || tagName).split('.').pop();
    const bounds = getText('bounds');
    const clickable = attrs.includes('clickable="true"');
    const enabled = attrs.includes('enabled="true"');
    const displayed = attrs.includes('displayed="true"');
    
    const hasUsefulInfo = text || resourceId || clickable;
    
    if (displayed && hasUsefulInfo) {
      let label = text || (resourceId ? resourceId.split(':id/').pop().replace(/_/g, ' ') : className);
      elements.push({ label, type: className, clickable, enabled, text, resourceId, bounds });
    }
  }
  
  return elements;
}

const elements = parseUI(sampleXML);
console.log('Found', elements.length, 'elements:');
console.log(JSON.stringify(elements, null, 2));
