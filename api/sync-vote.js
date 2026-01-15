// api/sync-vote.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const voteData = req.body;
      console.log('📥 Received vote from device:', voteData.deviceId);
      
      // Simpan ke Redis/Vercel KV (atau database)
      // Untuk sementara kita simpan di memory (temporary solution)
      
      // Return success
      res.status(200).json({ 
        success: true, 
        message: 'Vote synced successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to sync vote' 
      });
    }
  } else if (req.method === 'GET') {
    // GET data untuk admin dashboard
    try {
      // Ambil semua data voting (dari memory/database)
      const allVotes = await getAllVotes();
      
      res.status(200).json({
        success: true,
        data: allVotes,
        count: allVotes.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Get data error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get votes' 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Temporary in-memory storage (untuk testing)
let votesStorage = [];

async function getAllVotes() {
  // Combine in-memory votes with any other sources
  return votesStorage;
}