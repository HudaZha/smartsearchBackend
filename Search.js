// models/Search.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  title: { type: String },
  link: { type: String },
  snippet: { type: String }
}, { _id: false });

const searchSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true }, // stored lowercase
  results: { type: [resultSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Search', searchSchema);
