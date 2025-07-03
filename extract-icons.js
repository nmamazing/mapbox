const fs = require('fs');
const path = require('path');

// Import the specific icons we need
const mdi = require('@mdi/js');

// Create the DealMarkers directory if it doesn't exist
const dealMarkersDir = path.join(__dirname, 'assets', 'DealMarkers');
if (!fs.existsSync(dealMarkersDir)) {
  fs.mkdirSync(dealMarkersDir, { recursive: true });
}

// Define the icons to extract with their correct MDI names
const icons = [
  { name: 'pickaxe', mdiName: 'mdiPickaxe' },
  { name: 'baby-bottle-outline', mdiName: 'mdiBabyBottleOutline' },
  { name: 'handshake-outline', mdiName: 'mdiHandshakeOutline' },
  { name: 'thumb-up-outline', mdiName: 'mdiThumbUpOutline' },
  { name: 'thumb-down-outline', mdiName: 'mdiThumbDownOutline' },
  { name: 'hand-front', mdiName: 'mdiHandFront' },
  { name: 'exclamation-thick', mdiName: 'mdiExclamationThick' },
  { name: 'map-marker', mdiName: 'mdiMapMarker' }
];

// Extract each icon
icons.forEach(icon => {
  try {
    const iconContent = mdi[icon.mdiName];
    if (iconContent) {
      const filePath = path.join(dealMarkersDir, `${icon.name}.svg`);
      fs.writeFileSync(filePath, iconContent);
      console.log(`✅ Created: ${filePath}`);
    } else {
      console.log(`❌ Icon not found: ${icon.mdiName}`);
    }
  } catch (error) {
    console.log(`❌ Error with ${icon.name}: ${error.message}`);
  }
});

console.log('\nIcon extraction completed!');
console.log(`Location: ${dealMarkersDir}`);

// List available icons that start with 'mdi'
console.log('\nAvailable MDI icons (first 20):');
const availableIcons = Object.keys(mdi).filter(key => key.startsWith('mdi')).slice(0, 20);
availableIcons.forEach(icon => console.log(`  ${icon}`)); 