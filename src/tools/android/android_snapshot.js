/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { getAppiumDriver, isMockMode } = require('../../appiumClient');

/**
 * Parse XML string into a tree structure
 * Handles Android UI hierarchy XML format with proper parent-child relationships
 */
function parseXMLToTree(xmlString) {
  const elements = [];
  const stack = [];
  
  // Match opening tags, self-closing tags, and closing tags
  const tagRegex = /<(\/?)([\w.]+)([^>]*?)(\/?)>/g;
  let match;
  
  while ((match = tagRegex.exec(xmlString)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attrsStr = match[3];
    const isSelfClosing = match[4] === '/';
    
    if (isClosing) {
      stack.pop();
    } else {
      // Parse attributes
      const attrs = {};
      const attrRegex = /([\w-]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }
      
      const element = {
        tag: tagName,
        attrs,
        children: [],
        parent: stack.length > 0 ? stack[stack.length - 1] : null,
        depth: stack.length
      };
      
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(element);
      } else {
        elements.push(element);
      }
      
      if (!isSelfClosing) {
        stack.push(element);
      }
    }
  }
  
  return elements;
}

/**
 * Collect all text content from an element and its descendants
 */
function collectAllText(element) {
  const texts = [];
  
  const text = element.attrs.text?.trim();
  const contentDesc = element.attrs['content-desc']?.trim();
  
  if (text) texts.push(text);
  if (contentDesc && contentDesc !== text) texts.push(contentDesc);
  
  for (const child of element.children || []) {
    texts.push(...collectAllText(child));
  }
  
  return [...new Set(texts.filter(Boolean))]; // Dedupe
}

/**
 * Parse bounds string "[x1,y1][x2,y2]" to object
 */
function parseBounds(boundsStr) {
  if (!boundsStr) return null;
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  
  const x1 = parseInt(match[1]);
  const y1 = parseInt(match[2]);
  const x2 = parseInt(match[3]);
  const y2 = parseInt(match[4]);
  
  return {
    x1, y1, x2, y2,
    width: x2 - x1,
    height: y2 - y1,
    centerX: Math.round((x1 + x2) / 2),
    centerY: Math.round((y1 + y2) / 2)
  };
}

/**
 * Get the semantic type of an element for categorization
 */
function getSemanticType(element) {
  const { tag, attrs } = element;
  const className = tag.split('.').pop().toLowerCase();
  
  if (attrs.checkable === 'true') {
    if (className.includes('switch') || className.includes('toggle')) return 'toggle';
    if (className.includes('checkbox')) return 'checkbox';
    if (className.includes('radio')) return 'radio';
    return 'checkable';
  }
  
  if (className.includes('edittext') || className.includes('textfield') || className.includes('autocomplete')) return 'input';
  if (className.includes('button')) return 'button';
  if (className.includes('textview')) return 'text';
  if (className.includes('imageview') || className.includes('imagebutton')) return 'image';
  if (className.includes('recyclerview') || className.includes('listview')) return 'list';
  if (className.includes('scrollview')) return 'scroll';
  if (className.includes('spinner')) return 'dropdown';
  if (className.includes('seekbar') || className.includes('slider')) return 'slider';
  if (className.includes('progressbar')) return 'progress';
  
  if (attrs.scrollable === 'true') return 'scroll';
  if (attrs.clickable === 'true') return 'clickable';
  
  return 'container';
}

/**
 * Build a comprehensive UI model from the XML tree
 */
function buildUIModel(elements, screenWidth = 1080, screenHeight = 2400) {
  const model = {
    screen: { width: screenWidth, height: screenHeight },
    items: [],        // All meaningful items with full context
    inputs: [],       // Text input fields
    toggles: [],      // Switches, checkboxes
    buttons: [],      // Explicit buttons
    scrollables: []   // Scrollable containers
  };
  
  function processElement(element) {
    const { attrs } = element;
    
    // Skip non-displayed elements
    if (attrs.displayed === 'false') return;
    
    const bounds = parseBounds(attrs.bounds);
    const semanticType = getSemanticType(element);
    
    // Collect text from this element AND all its children
    const allTexts = collectAllText(element);
    const directText = attrs.text?.trim() || '';
    const contentDesc = attrs['content-desc']?.trim() || '';
    const resourceId = attrs['resource-id'] || '';
    
    // Determine the best label for this element
    let label = allTexts.join(' • ') || contentDesc || resourceId.split('/').pop()?.replace(/_/g, ' ') || '';
    
    // Build selector options (multiple strategies for flexibility)
    const selectors = [];
    if (directText) selectors.push({ type: 'text', value: directText, selector: `text=${directText}` });
    if (contentDesc) selectors.push({ type: 'content-desc', value: contentDesc, selector: `content-desc=${contentDesc}` });
    if (resourceId) selectors.push({ type: 'resource-id', value: resourceId, selector: `resource-id=${resourceId}` });
    if (bounds) selectors.push({ type: 'coordinates', value: `${bounds.centerX},${bounds.centerY}`, selector: `coordinate=${bounds.centerX},${bounds.centerY}` });
    
    const isActionable = attrs.clickable === 'true' || attrs.checkable === 'true' || 
                         attrs['long-clickable'] === 'true' || attrs.focusable === 'true';
    const isEnabled = attrs.enabled !== 'false';
    
    // Build element info object
    const info = {
      type: semanticType,
      class: element.tag.split('.').pop(),
      label: label,
      text: directText,
      contentDesc: contentDesc,
      childTexts: allTexts.filter(t => t !== directText && t !== contentDesc),
      resourceId: resourceId,
      selectors: selectors,
      primarySelector: selectors[0]?.selector || null,
      bounds: bounds,
      state: {
        clickable: attrs.clickable === 'true',
        checkable: attrs.checkable === 'true',
        checked: attrs.checked === 'true',
        enabled: isEnabled,
        focusable: attrs.focusable === 'true',
        focused: attrs.focused === 'true',
        scrollable: attrs.scrollable === 'true',
        selected: attrs.selected === 'true',
        password: attrs.password === 'true'
      }
    };
    
    // Categorize into appropriate lists
    const shouldInclude = isActionable || semanticType === 'input' || 
                          semanticType === 'toggle' || semanticType === 'checkbox' ||
                          (directText && semanticType === 'text');
    
    if (shouldInclude && isEnabled && bounds) {
      model.items.push(info);
      
      if (semanticType === 'input') {
        model.inputs.push(info);
      } else if (['toggle', 'checkbox', 'radio', 'checkable'].includes(semanticType)) {
        model.toggles.push(info);
      } else if (semanticType === 'button') {
        model.buttons.push(info);
      }
    }
    
    if (semanticType === 'scroll' || semanticType === 'list') {
      model.scrollables.push(info);
    }
    
    // Process children
    for (const child of element.children || []) {
      processElement(child);
    }
  }
  
  for (const element of elements) {
    processElement(element);
  }
  
  // Sort items by vertical position for natural reading order
  model.items.sort((a, b) => (a.bounds?.y1 || 0) - (b.bounds?.y1 || 0));
  
  return model;
}

/**
 * Format the UI model as markdown for agent consumption
 */
function formatAsMarkdown(model) {
  let out = '# Android Screen Snapshot\n\n';
  out += `📱 **Screen:** ${model.screen.width}×${model.screen.height}\n`;
  out += `📊 **Found:** ${model.items.length} interactive elements\n\n`;
  
  if (model.items.length === 0) {
    out += '⚠️ No interactive elements found on screen.\n';
    out += 'Try scrolling or navigating to expose more elements.\n';
    return out;
  }
  
  // Main elements table
  out += '## Interactive Elements\n\n';
  out += '| # | Type | Label | Selector | State |\n';
  out += '|--:|------|-------|----------|-------|\n';
  
  model.items.forEach((item, i) => {
    const label = (item.label || item.class).substring(0, 35).replace(/\|/g, '│').replace(/\n/g, ' ');
    const states = [];
    if (item.state.checkable) states.push(item.state.checked ? '☑ ON' : '☐ OFF');
    if (item.state.focused) states.push('🎯');
    if (item.state.selected) states.push('✓');
    if (!item.state.enabled) states.push('🚫');
    
    const selector = item.primarySelector || `tap(${item.bounds?.centerX},${item.bounds?.centerY})`;
    out += `| ${i + 1} | ${item.type} | ${label} | \`${selector}\` | ${states.join(' ') || '-'} |\n`;
  });
  
  // Toggles section (important for settings)
  if (model.toggles.length > 0) {
    out += '\n## Toggles & Switches\n\n';
    model.toggles.forEach((t, i) => {
      const status = t.state.checked ? '✅ **ON**' : '⬜ **OFF**';
      out += `${i + 1}. **${t.label || t.class}** → ${status}\n`;
      out += `   Selector: \`${t.primarySelector}\`\n`;
    });
  }
  
  // Input fields section
  if (model.inputs.length > 0) {
    out += '\n## Input Fields\n\n';
    model.inputs.forEach((inp, i) => {
      const hint = inp.text || inp.contentDesc || '(empty)';
      out += `${i + 1}. **${hint}**${inp.state.password ? ' 🔒' : ''}${inp.state.focused ? ' 🎯 focused' : ''}\n`;
      out += `   Selector: \`${inp.primarySelector}\`\n`;
    });
  }
  
  // Scrollable areas
  if (model.scrollables.length > 0) {
    out += '\n## Scrollable Areas\n\n';
    model.scrollables.forEach((s, i) => {
      out += `${i + 1}. ${s.class} at y=${s.bounds?.y1 || '?'}-${s.bounds?.y2 || '?'}\n`;
    });
  }
  
  out += '\n---\n';
  out += '💡 **Tips:** Use `text=...` selector for text-based elements, ';
  out += '`coordinate=X,Y` for tap by position, or `resource-id=...` for stable IDs.\n';
  
  return out;
}

/**
 * Format as JSON for programmatic use
 */
function formatAsJSON(model) {
  return JSON.stringify({
    screen: model.screen,
    summary: {
      total: model.items.length,
      inputs: model.inputs.length,
      toggles: model.toggles.length,
      buttons: model.buttons.length,
      scrollables: model.scrollables.length
    },
    elements: model.items.map(item => ({
      type: item.type,
      label: item.label,
      selector: item.primarySelector,
      alternateSelectors: item.selectors.slice(1).map(s => s.selector),
      bounds: item.bounds ? { x: item.bounds.centerX, y: item.bounds.centerY, width: item.bounds.width, height: item.bounds.height } : null,
      state: {
        checked: item.state.checkable ? item.state.checked : undefined,
        enabled: item.state.enabled,
        focused: item.state.focused || undefined
      }
    })),
    toggles: model.toggles.map(t => ({
      label: t.label,
      checked: t.state.checked,
      selector: t.primarySelector
    })),
    inputs: model.inputs.map(i => ({
      hint: i.text || i.contentDesc,
      password: i.state.password,
      focused: i.state.focused,
      selector: i.primarySelector
    }))
  }, null, 2);
}

module.exports = {
  definition: {
    name: 'android_snapshot',
    description: 'Get a comprehensive snapshot of the current Android screen showing all interactive elements (buttons, toggles, inputs, text) with their labels, selectors, and states. Essential for understanding what can be interacted with before taking actions.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['markdown', 'json'],
          description: 'Output format. markdown is human-readable with tables, json is structured data.',
          default: 'markdown'
        }
      }
    }
  },
  
  async handler(args = {}) {
    try {
      if (isMockMode()) {
        const mockModel = {
          screen: { width: 1080, height: 2400 },
          items: [
            { type: 'clickable', class: 'LinearLayout', label: 'Network & internet', text: '', contentDesc: '', childTexts: ['Network & internet'], resourceId: '', selectors: [{ selector: 'text=Network & internet' }], primarySelector: 'text=Network & internet', bounds: { centerX: 540, centerY: 300 }, state: { clickable: true, enabled: true, checkable: false, checked: false } },
            { type: 'toggle', class: 'Switch', label: 'Wi-Fi', text: '', contentDesc: 'Wi-Fi', childTexts: [], resourceId: 'com.android.settings:id/switch_widget', selectors: [{ selector: 'content-desc=Wi-Fi' }], primarySelector: 'content-desc=Wi-Fi', bounds: { centerX: 900, centerY: 400 }, state: { clickable: true, enabled: true, checkable: true, checked: true } }
          ],
          inputs: [],
          toggles: [{ type: 'toggle', class: 'Switch', label: 'Wi-Fi', primarySelector: 'content-desc=Wi-Fi', state: { checked: true, enabled: true } }],
          buttons: [],
          scrollables: []
        };
        
        const output = args.format === 'json' ? formatAsJSON(mockModel) : formatAsMarkdown(mockModel);
        return { content: [{ type: 'text', text: output }] };
      }
      
      const driver = await getAppiumDriver();
      const pageSource = await driver.getPageSource();
      
      // Get screen dimensions
      let screenWidth = 1080, screenHeight = 2400;
      try {
        const size = await driver.getWindowSize();
        screenWidth = size.width;
        screenHeight = size.height;
      } catch (e) { /* use defaults */ }
      
      // Parse and build model
      const tree = parseXMLToTree(pageSource);
      const model = buildUIModel(tree, screenWidth, screenHeight);
      
      // Format output
      const output = args.format === 'json' ? formatAsJSON(model) : formatAsMarkdown(model);
      
      return { content: [{ type: 'text', text: output }] };
      
    } catch (error) {
      throw new Error(`Failed to get Android snapshot: ${error.message}`);
    }
  }
};
