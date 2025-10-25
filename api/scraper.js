const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_KEY = process.env.SERVICE_ACCOUNT_KEY;

async function extractBadgeData(profileUrl) {
  try {
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const pageText = $('body').text();
    
    // Count badges and games from text content
    const badgeCount = (pageText.match(/\[Skill Badge\]/g) || []).length;
    const arcadeCount = (pageText.match(/\[Game\]/g) || []).length;

    return {
      skillBadges: badgeCount,
      arcadeGames: arcadeCount,
      success: true
    };
  } catch (error) {
    console.error(`Error scraping ${profileUrl}: ${error.message}`);
    return {
      skillBadges: 0,
      arcadeGames: 0,
      success: false
    };
  }
}

async function scrapeAllProfiles() {
  try {
    console.log(`[${new Date().toISOString()}] Starting profile scrape...`);

    const doc = new GoogleSpreadsheet(SHEET_ID);
    const serviceAccountAuth = new JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: SERVICE_ACCOUNT_KEY,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });

    await doc.useServiceAccountAuth(serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    console.log(`Scraping ${rows.length} profiles...`);

    for (let i = 0; i < rows.length; i++) {
      const profileUrl = rows[i]['Google Cloud Skills Boost Profile URL'];
      
      if (!profileUrl) continue;

      console.log(`[${i + 1}/${rows.length}] ${rows[i]['User Name']}...`);
      
      const data = await extractBadgeData(profileUrl);
      
      rows[i]['# of Skill Badges Completed'] = data.skillBadges;
      rows[i]['# of Arcade Games Completed'] = data.arcadeGames;
      rows[i]['All Skill Badges & Games Completed'] = 
        (data.skillBadges > 0 && data.arcadeGames > 0) ? 'Yes' : 'No';
      
      await rows[i].save();
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log('✅ All profiles scraped successfully');
  } catch (error) {
    console.error('❌ Error in scrapeAllProfiles:', error.message);
  }
}

module.exports = { scrapeAllProfiles, extractBadgeData };
