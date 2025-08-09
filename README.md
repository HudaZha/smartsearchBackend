# SmartSearch — Backend

This Node.js + Express backend provides a single endpoint:

GET /search?query=<term>

Behavior:
- Checks MongoDB for cached results (collection: searches)
- If found: returns cached results
- If not found: calls Google Programmable Search (CSE), saves results, and returns them

Environment variables:
- MONGO_URI : MongoDB connection string (Atlas recommended)
- API_KEY   : Google CSE API key
- CX        : Google CSE Search Engine ID

Quick start (local):
1. copy `.env.example` to `.env` and fill values
2. npm install
3. npm start
