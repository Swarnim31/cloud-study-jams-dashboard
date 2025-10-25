const express = require('express');
const path = require('path');
const { scrapeAllProfiles } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

// API route to manually trigger scraping
app.get('/api/scrape', async (req, res) => {
  try {
    console.log('Manual scrape triggered');
    await scrapeAllProfiles();
    res.json({ success: true, message: 'Scraping completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Starting auto-scraper...');
    
    // Run scraper every 10 minutes (600,000 ms)
    scrapeAllProfiles();
    setInterval(scrapeAllProfiles, 10 * 60 * 1000);
  });
}

module.exports = app;
