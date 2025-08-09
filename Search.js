const mongoose = require('mongoose');

const SearchSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true },
  results: { type: Array, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7 // 7 days cache
  }
});

module.exports = mongoose.model('Search', SearchSchema);

