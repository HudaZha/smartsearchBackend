require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

let Search; // Will be set after MongoDB connects
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 30 * 1000,
  max: 10,
  message: { error: 'Too many requests, please slow down.' }
}));

// MongoDB connection
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');
    Search = require('./models/Search');
  } catch (err) {
    console.warn('⚠ MongoDB not connected, caching disabled:', err.message);
  }
})();

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const qLower = query.toLowerCase();

    // Check cache
    if (Search) {
      const cached = await Search.findOne({ query: qLower }).lean();
      if (cached?.results?.length) {
        return res.json({ fromCache: true, results: cached.results });
      }
    }

    // Fetch from Google Custom Search
    const { API_KEY, CX } = process.env;
    if (!API_KEY || !CX) {
      return res.status(500).json({ error: 'API_KEY/CX missing in env' });
    }

    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${API_KEY}&cx=${CX}&num=10`;
    const gresp = await axios.get(url);

    const results = (gresp.data.items || []).map(it => ({
      title: it.title || '',
      link: it.link || '',
      snippet: it.snippet || ''
    }));

    if (Search) {
      try {
        await Search.create({ query: qLower, results });
      } catch (err) {
        console.warn('Cache save failed:', err.message);
      }
    }

    res.json({ fromCache: false, results });
  } catch (err) {
    console.error(' Search error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running on port ${PORT}`);
});

