// api/get-votes.js - Simple API to get votes
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    // Simple in-memory storage for demo
    // In production, use Vercel KV, MongoDB, or other database
    
    // Get votes from "database" (for demo, we'll use a global variable)
    // Note: This won't persist between serverless function calls
    // For production, use a real database
    
    const votes = global.votesStorage || [];
    
    return res.status(200).json({
      success: true,
      count: votes.length,
      votes: votes,
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'POST') {
    try {
      const voteData = req.body;
      
      // Initialize storage if not exists
      if (!global.votesStorage) {
        global.votesStorage = [];
      }
      
      // Add vote
      global.votesStorage.push({
        ...voteData,
        receivedAt: new Date().toISOString(),
        serverId: Math.random().toString(36).substr(2, 9)
      });
      
      // Limit storage to last 1000 votes for demo
      if (global.votesStorage.length > 1000) {
        global.votesStorage = global.votesStorage.slice(-1000);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Vote received',
        voteId: voteData.syncId,
        serverTimestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}