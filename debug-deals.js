const { zohoService } = require('./src/services/zohoService');

// Import the stage mapping from DealMarker
const STAGE_ICONS = {
  // Early stage deals
  'Initial Contact': { icon: 'pickaxe', color: '#FFD700' },
  'New Lead': { icon: 'pickaxe', color: '#FFD700' },
  'Qualification': { icon: 'pickaxe', color: '#FFD700' },
  'Lead': { icon: 'pickaxe', color: '#FFD700' },
  'New': { icon: 'pickaxe', color: '#FFD700' },
  
  // Nurturing deals
  'In Progress': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  'Nurturing': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  'Nurture': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  'Development': { icon: 'baby-bottle-outline', color: '#4CAF50' },
  
  // Contract deals
  'Under Contract': { icon: 'handshake-outline', color: '#2196F3' },
  'Proposal': { icon: 'handshake-outline', color: '#2196F3' },
  'Negotiation': { icon: 'handshake-outline', color: '#2196F3' },
  'Contract': { icon: 'handshake-outline', color: '#2196F3' },
  'Pending': { icon: 'handshake-outline', color: '#2196F3' },
  
  // Successful deals
  'Closed': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Won': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Closed Won': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Completed': { icon: 'thumb-up-outline', color: '#9C27B0' },
  'Success': { icon: 'thumb-up-outline', color: '#9C27B0' },
  
  // Failed deals
  'Lost': { icon: 'thumb-down-outline', color: '#F44336' },
  'Cancelled': { icon: 'thumb-down-outline', color: '#F44336' },
  'Closed Lost': { icon: 'thumb-down-outline', color: '#F44336' },
  'Failed': { icon: 'thumb-down-outline', color: '#F44336' },
  'Rejected': { icon: 'thumb-down-outline', color: '#F44336' },
  
  // On hold deals
  'On Hold': { icon: 'hand', color: '#FF9800' },
  'Hold': { icon: 'hand', color: '#FF9800' },
  'Paused': { icon: 'hand', color: '#FF9800' },
  'Suspended': { icon: 'hand', color: '#FF9800' },
  
  // Follow up deals
  'Follow Up': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Follow-up': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Followup': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Review': { icon: 'exclamation-thick', color: '#00BCD4' },
  'Evaluation': { icon: 'exclamation-thick', color: '#00BCD4' },
  
  // Default fallback
  'default': { icon: 'map-marker', color: '#007AFF' }
};

async function debugDeals() {
  try {
    console.log('🔍 Fetching deals from Zoho...\n');
    
    // Fetch all deals from Zoho
    const deals = await zohoService.getAllDeals(
      'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
      'Created_Time',
      'desc'
    );
    
    console.log(`📊 Total deals fetched: ${deals.length}\n`);
    
    // Get unique stages
    const uniqueStages = [...new Set(deals.map(deal => deal.Stage))];
    console.log('🎯 Unique stages found in Zoho:');
    uniqueStages.forEach(stage => {
      const iconConfig = STAGE_ICONS[stage] || STAGE_ICONS.default;
      const status = STAGE_ICONS[stage] ? '✅' : '❌';
      console.log(`  ${status} "${stage}" -> ${iconConfig.icon} (${iconConfig.color})`);
    });
    
    console.log('\n📋 Sample deals with stages:');
    console.log('─'.repeat(80));
    
    // Show first 10 deals with their stages
    deals.slice(0, 10).forEach((deal, index) => {
      const iconConfig = STAGE_ICONS[deal.Stage] || STAGE_ICONS.default;
      const status = STAGE_ICONS[deal.Stage] ? '✅' : '❌';
      console.log(`${index + 1}. ${status} "${deal.Deal_Name}"`);
      console.log(`   Stage: "${deal.Stage}" -> ${iconConfig.icon} (${iconConfig.color})`);
      console.log(`   Owner: ${deal.Owner?.name || 'N/A'}`);
      console.log(`   Address: ${deal.Property_Address || 'N/A'}`);
      console.log('');
    });
    
    // Count deals by stage
    console.log('📈 Deal count by stage:');
    console.log('─'.repeat(40));
    const stageCounts = {};
    deals.forEach(deal => {
      stageCounts[deal.Stage] = (stageCounts[deal.Stage] || 0) + 1;
    });
    
    Object.entries(stageCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([stage, count]) => {
        const iconConfig = STAGE_ICONS[stage] || STAGE_ICONS.default;
        const status = STAGE_ICONS[stage] ? '✅' : '❌';
        console.log(`  ${status} "${stage}": ${count} deals -> ${iconConfig.icon}`);
      });
    
    // Show missing stages
    const missingStages = uniqueStages.filter(stage => !STAGE_ICONS[stage]);
    if (missingStages.length > 0) {
      console.log('\n⚠️  Missing stage mappings:');
      missingStages.forEach(stage => {
        console.log(`  - "${stage}"`);
      });
      console.log('\n💡 Add these to the STAGE_ICONS mapping in DealMarker.tsx');
    }
    
  } catch (error) {
    console.error('❌ Error fetching deals:', error);
  }
}

// Run the debug function
debugDeals(); 