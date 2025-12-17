const fs = require('fs');
const path = require('path');

// Read the HTML file
const htmlContent = fs.readFileSync(path.join(__dirname, 'Actions.html'), 'utf-8');

// Create output directory
const outputDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract all symbol elements
const symbolRegex = /<symbol\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/symbol>/g;
let match;
let count = 0;

while ((match = symbolRegex.exec(htmlContent)) !== null) {
  const iconId = match[1];
  const attributes = match[2];
  const innerContent = match[3];

  // Extract viewBox from attributes
  const viewBoxMatch = attributes.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 32 32';

  // Extract other attributes (fill, etc.)
  const fillMatch = attributes.match(/fill="([^"]+)"/);
  const fill = fillMatch ? ` fill="${fillMatch[1]}"` : '';

  // Create standalone SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${fill}>${innerContent}</svg>`;

  // Clean up the icon name (remove 'icon-' prefix if present)
  const fileName = iconId.replace(/^icon-/, '') + '.svg';

  // Write to file
  fs.writeFileSync(path.join(outputDir, fileName), svg);
  count++;
}

console.log(`Extracted ${count} icons to ${outputDir}`);
