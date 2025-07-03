const fs = require('fs');
const path = require('path');

// Import the path data from @mdi/js
const {
  mdiPickaxe,
  mdiBabyBottleOutline,
  mdiHandshakeOutline,
  mdiThumbUpOutline,
  mdiThumbDownOutline,
  mdiExclamationThick,
  mdiMapMarker
} = require('@mdi/js');

// Define the icons to fix
const icons = [
  { name: 'pickaxe', pathData: mdiPickaxe },
  { name: 'baby-bottle-outline', pathData: mdiBabyBottleOutline },
  { name: 'handshake-outline', pathData: mdiHandshakeOutline },
  { name: 'thumb-up-outline', pathData: mdiThumbUpOutline },
  { name: 'thumb-down-outline', pathData: mdiThumbDownOutline },
  { name: 'exclamation-thick', pathData: mdiExclamationThick },
  { name: 'map-marker', pathData: mdiMapMarker }
];

const dealMarkersDir = path.join(__dirname, 'assets', 'DealMarkers');

// Create proper SVG files
icons.forEach(icon => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="${icon.pathData}"/>
</svg>`;
  
  const filePath = path.join(dealMarkersDir, `${icon.name}.svg`);
  fs.writeFileSync(filePath, svgContent);
  console.log(`✅ Fixed: ${filePath}`);
});

console.log('\nAll SVG files fixed!'); 