// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); 
const Search = require('./models/Search');

const app = express();

// ====== Middleware ======
app.use(cors());
app.use(express.json());

// Rate limiting to avoid abuse
const limiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 10, // max requests per window
  message: { error: 'Too many requests, please slow down.' }
});
app.use(limiter);

// ====== MongoDB Connection ======
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartsearch';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err.message || err));

// ====== Health Check ======
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ====== Main Search Endpoint ======
app.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(400).json({ error: 'Query parameter is required' });

    const qLower = query.toLowerCase();

    // 1) Check cache (MongoDB)
    const cached = await Search.findOne({ query: qLower }).lean();
    if (cached?.results?.length) {
      return res.json({ fromCache: true, results: cached.results });
    }

    // 2) Not cached -> call Google CSE
    const API_KEY = process.env.API_KEY;
    const CX = process.env.CX;
    if (!API_KEY || !CX) {
      return res.status(500).json({ error: 'Search provider not configured (API_KEY/CX missing)' });
    }

    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${API_KEY}&cx=${CX}&num=10`;
    const gresp = await axios.get(url);

    const results = (gresp.data.items || []).map(it => ({
      title: it.title || '',
      link: it.link || '',
      snippet: it.snippet || it.title || ''
    }));

    // Save to DB for caching
    try {
      await Search.create({ query: qLower, results });
    } catch (saveErr) {
      console.warn(' Could not save cache (non-fatal):', saveErr.message || saveErr);
    }

    return res.json({ fromCache: false, results });
  } catch (err) {
    console.error('Search endpoint error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running on port ${PORT}`);
});

