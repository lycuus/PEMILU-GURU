// sync-service.js - Client-side sync service
class SyncService {
    constructor() {
        this.apiUrl = '/api/sync-vote'; // Relative URL untuk Vercel Function
        this.lastSyncTime = localStorage.getItem('lastCloudSync') || 0;
        this.isOnline = navigator.onLine;
        this.pendingSyncs = JSON.parse(localStorage.getItem('pendingSyncs') || '[]');
    }

    // ============================================
    // 1. SYNC VOTE TO CLOUD
    // ============================================
    async syncVote(voteData) {
        console.log('☁️ Syncing vote to cloud...', voteData);
        
        // Add device info to vote data
        const syncData = {
            ...voteData,
            deviceId: this.getDeviceId(),
            browser: navigator.userAgent,
            timestamp: new Date().toISOString(),
            syncId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        
        try {
            if (this.isOnline) {
                // Try to sync to cloud
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(syncData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Vote synced to cloud:', result);
                    
                    // Update last sync time
                    this.lastSyncTime = Date.now();
                    localStorage.setItem('lastCloudSync', this.lastSyncTime.toString());
                    
                    return { success: true, data: result };
                } else {
                    throw new Error('Cloud sync failed');
                }
            } else {
                // Save for later sync (offline)
                this.saveForLaterSync(syncData);
                return { success: true, offline: true, message: 'Saved for offline sync' };
            }
            
        } catch (error) {
            console.error('❌ Cloud sync error:', error);
            
            // Save for retry later
            this.saveForLaterSync(syncData);
            
            // Fallback to localStorage sharing method
            this.fallbackSync(syncData);
            
            return { 
                success: false, 
                error: error.message,
                fallback: true 
            };
        }
    }

    // ============================================
    // 2. SAVE FOR LATER SYNC (OFFLINE)
    // ============================================
    saveForLaterSync(data) {
        this.pendingSyncs.push(data);
        localStorage.setItem('pendingSyncs', JSON.stringify(this.pendingSyncs));
        
        // Save to special key for admin to detect
        localStorage.setItem('pending_sync_' + data.syncId, JSON.stringify(data));
        
        console.log('💾 Saved for offline sync:', data.syncId);
    }

    // ============================================
    // 3. FALLBACK SYNC (LOCALSTORAGE SHARING)
    // ============================================
    fallbackSync(data) {
        console.log('🔄 Using fallback sync method');
        
        // Method 1: Save to shared localStorage key
        const cloudVotes = JSON.parse(localStorage.getItem('cloud_votes') || '[]');
        cloudVotes.push(data);
        localStorage.setItem('cloud_votes', JSON.stringify(cloudVotes));
        
        // Method 2: Save with timestamp for admin to find
        const timestamp = Date.now();
        localStorage.setItem(`vote_${timestamp}`, JSON.stringify(data));
        
        // Method 3: Set trigger for admin
        localStorage.setItem('new_vote_trigger', timestamp.toString());
        
        // Method 4: Save to multiple keys for redundancy
        this.saveToMultipleKeys(data);
    }

    // ============================================
    // 4. SAVE TO MULTIPLE KEYS (REDUNDANCY)
    // ============================================
    saveToMultipleKeys(data) {
        // Key 1: By device
        const deviceVotes = JSON.parse(localStorage.getItem(`device_${this.getDeviceId()}`) || '[]');
        deviceVotes.push(data);
        localStorage.setItem(`device_${this.getDeviceId()}`, JSON.stringify(deviceVotes));
        
        // Key 2: By date
        const today = new Date().toISOString().split('T')[0];
        const dailyVotes = JSON.parse(localStorage.getItem(`votes_${today}`) || '[]');
        dailyVotes.push(data);
        localStorage.setItem(`votes_${today}`, JSON.stringify(dailyVotes));
        
        // Key 3: All votes combined
        const allVotes = JSON.parse(localStorage.getItem('all_votes') || '[]');
        allVotes.push(data);
        localStorage.setItem('all_votes', JSON.stringify(allVotes));
    }

    // ============================================
    // 5. GET DEVICE ID
    // ============================================
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        
        if (!deviceId) {
            // Create unique device ID
            deviceId = 'd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        
        return deviceId;
    }

    // ============================================
    // 6. RETRY PENDING SYNC
    // ============================================
    async retryPendingSyncs() {
        if (this.pendingSyncs.length === 0 || !this.isOnline) return;
        
        console.log('🔄 Retrying pending syncs...');
        
        const successfulSyncs = [];
        
        for (const syncData of this.pendingSyncs) {
            try {
                const result = await this.syncVote(syncData);
                if (result.success && !result.offline) {
                    successfulSyncs.push(syncData.syncId);
                }
            } catch (error) {
                console.error('❌ Retry failed:', error);
            }
        }
        
        // Remove successful syncs
        this.pendingSyncs = this.pendingSyncs.filter(
            sync => !successfulSyncs.includes(sync.syncId)
        );
        
        localStorage.setItem('pendingSyncs', JSON.stringify(this.pendingSyncs));
        
        console.log(`✅ Retried ${successfulSyncs.length} pending syncs`);
    }

    // ============================================
    // 7. GET ALL VOTES FOR ADMIN
    // ============================================
    async getAllVotesForAdmin() {
        try {
            // Try to get from cloud first
            const response = await fetch(this.apiUrl);
            
            if (response.ok) {
                const result = await response.json();
                return result.data || [];
            }
            
        } catch (error) {
            console.log('⚠️ Cloud fetch failed, using localStorage fallback');
        }
        
        // Fallback: Collect from all localStorage keys
        return this.collectFromLocalStorage();
    }

    // ============================================
    // 8. COLLECT FROM LOCALSTORAGE
    // ============================================
    collectFromLocalStorage() {
        const allVotes = [];
        const seenIds = new Set();
        
        // Collect from all possible keys
        const keysToCheck = [
            'votes',
            'cloud_votes',
            'all_votes',
            'teacher_votes',
            'admin_votes'
        ];
        
        // Add date-based keys (last 7 days)
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            keysToCheck.push(`votes_${dateStr}`);
        }
        
        // Add device-based keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('device_') || key.startsWith('vote_')) {
                keysToCheck.push(key);
            }
        }
        
        // Collect unique votes
        keysToCheck.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const votes = JSON.parse(data);
                    
                    if (Array.isArray(votes)) {
                        votes.forEach(vote => {
                            const voteId = vote.syncId || vote.timestamp || JSON.stringify(vote);
                            if (!seenIds.has(voteId)) {
                                seenIds.add(voteId);
                                allVotes.push(vote);
                            }
                        });
                    } else if (typeof votes === 'object') {
                        const voteId = votes.syncId || votes.timestamp || JSON.stringify(votes);
                        if (!seenIds.has(voteId)) {
                            seenIds.add(voteId);
                            allVotes.push(votes);
                        }
                    }
                }
            } catch (error) {
                // Skip invalid data
            }
        });
        
        console.log(`📊 Collected ${allVotes.length} votes from localStorage`);
        return allVotes;
    }

    // ============================================
    // 9. SETUP NETWORK LISTENERS
    // ============================================
    setupNetworkListeners() {
        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Device is online');
            this.retryPendingSyncs();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Device is offline');
        });
        
        // Auto-retry every minute when online
        setInterval(() => {
            if (this.isOnline) {
                this.retryPendingSyncs();
            }
        }, 60000);
    }

    // ============================================
    // 10. INITIALIZE
    // ============================================
    initialize() {
        console.log('🚀 Sync Service initializing...');
        this.setupNetworkListeners();
        
        // Auto-retry pending syncs on load
        setTimeout(() => {
            this.retryPendingSyncs();
        }, 5000);
        
        console.log('✅ Sync Service ready');
    }
}

// Global instance
window.syncService = new SyncService();