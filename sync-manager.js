// ============================================
// SYNC MANAGER - UNTUK SINCRONISASI ANTAR DEVICE
// ============================================

class SyncManager {
    constructor() {
        this.lastSync = localStorage.getItem('last_sync') || '0';
        this.syncInterval = null;
        this.isSyncing = false;
    }
    
    // ============================================
    // 1. WEBSOCKET SYNC (REAL-TIME)
    // ============================================
    initWebSocket() {
        // Untuk implementasi server nanti, ini template
        console.log("📡 WebSocket sync initialized");
        
        // Fallback ke metode lain jika WebSocket tidak tersedia
        this.startPollingSync();
    }
    
    // ============================================
    // 2. POLLING SYNC (SETIAP 10 DETIK)
    // ============================================
    startPollingSync() {
        console.log("🔄 Starting polling sync (10 seconds)");
        
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 10000); // Sync setiap 10 detik
    }
    
    // ============================================
    // 3. SYNC DATA KE ADMIN DASHBOARD
    // ============================================
    async syncData() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        console.log("🔄 Syncing data to admin dashboard...");
        
        try {
            // 1. Collect all voting data
            const allData = this.collectAllData();
            
            // 2. Store in shared sync storage
            await this.storeInSyncStorage(allData);
            
            // 3. Trigger admin dashboard update
            await this.triggerAdminUpdate(allData);
            
            // 4. Update last sync timestamp
            this.lastSync = Date.now().toString();
            localStorage.setItem('last_sync', this.lastSync);
            
            console.log("✅ Sync completed successfully");
            
        } catch (error) {
            console.error("❌ Sync failed:", error);
        } finally {
            this.isSyncing = false;
        }
    }
    
    // ============================================
    // 4. COLLECT ALL DATA FROM LOCALSTORAGE
    // ============================================
    collectAllData() {
        const syncData = {
            timestamp: new Date().toISOString(),
            device_id: this.getDeviceId(),
            votes: JSON.parse(localStorage.getItem('votes') || '[]'),
            teacher_votes: JSON.parse(localStorage.getItem('teacher_votes') || '[]'),
            candidates: JSON.parse(localStorage.getItem('candidates') || '[]'),
            voters: JSON.parse(localStorage.getItem('voters') || '[]'),
            teachers: JSON.parse(localStorage.getItem('teachers') || '[]'),
            session_count: parseInt(localStorage.getItem('session_count') || '0')
        };
        
        console.log(`📊 Collected data: ${syncData.votes.length} votes, ${syncData.teacher_votes.length} teacher votes`);
        return syncData;
    }
    
    // ============================================
    // 5. STORE IN SYNC STORAGE (MULTI-METHOD)
    // ============================================
    async storeInSyncStorage(data) {
        try {
            // Method 1: localStorage dengan key khusus untuk admin
            localStorage.setItem('admin_sync_data', JSON.stringify(data));
            
            // Method 2: IndexedDB untuk data yang lebih besar
            await this.storeInIndexedDB(data);
            
            // Method 3: BroadcastChannel untuk tab lain
            this.broadcastToTabs(data);
            
            // Method 4: Server Sync (jika ada backend)
            // await this.sendToServer(data);
            
        } catch (error) {
            console.error("❌ Storage sync failed:", error);
        }
    }
    
    // ============================================
    // 6. STORE IN INDEXEDDB
    // ============================================
    async storeInIndexedDB(data) {
        if (!window.indexedDB) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('VoteSyncDB', 1);
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('sync_data')) {
                    db.createObjectStore('sync_data', { keyPath: 'timestamp' });
                }
            };
            
            request.onsuccess = function(event) {
                const db = event.target.result;
                const transaction = db.transaction(['sync_data'], 'readwrite');
                const store = transaction.objectStore('sync_data');
                
                const addRequest = store.add(data);
                
                addRequest.onsuccess = function() {
                    console.log("💾 Data stored in IndexedDB");
                    resolve();
                };
                
                addRequest.onerror = function(error) {
                    console.error("❌ IndexedDB error:", error);
                    reject(error);
                };
            };
            
            request.onerror = function(error) {
                console.error("❌ IndexedDB open error:", error);
                reject(error);
            };
        });
    }
    
    // ============================================
    // 7. BROADCAST TO OTHER TABS
    // ============================================
    broadcastToTabs(data) {
        // Method 1: BroadcastChannel API
        if ('BroadcastChannel' in window) {
            try {
                const channel = new BroadcastChannel('vote_sync_channel');
                channel.postMessage({
                    type: 'sync_data',
                    data: data,
                    source: 'voting_page'
                });
                console.log("📡 Broadcasted to other tabs");
                channel.close();
            } catch (error) {
                console.log("⚠️ BroadcastChannel not supported");
            }
        }
        
        // Method 2: localStorage event (for older browsers)
        const eventData = {
            type: 'sync_update',
            timestamp: Date.now(),
            data: data
        };
        
        localStorage.setItem('cross_tab_sync', JSON.stringify(eventData));
        setTimeout(() => {
            localStorage.removeItem('cross_tab_sync');
        }, 100);
    }
    
    // ============================================
    // 8. TRIGGER ADMIN DASHBOARD UPDATE
    // ============================================
    async triggerAdminUpdate(data) {
        try {
            // Buat trigger khusus untuk admin dashboard
            const adminTrigger = {
                type: 'new_votes_synced',
                timestamp: Date.now(),
                data_count: {
                    votes: data.votes.length,
                    teacher_votes: data.teacher_votes.length,
                    candidates: data.candidates.length
                },
                device: this.getDeviceId()
            };
            
            // Simpan trigger di localStorage dengan prefix khusus
            localStorage.setItem('admin_update_trigger', JSON.stringify(adminTrigger));
            localStorage.setItem('last_admin_update', Date.now().toString());
            
            console.log("🎯 Admin dashboard update triggered");
            
        } catch (error) {
            console.error("❌ Failed to trigger admin update:", error);
        }
    }
    
    // ============================================
    // 9. GET DEVICE ID (UNIQUE PER DEVICE)
    // ============================================
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        
        if (!deviceId) {
            // Generate unique device ID
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        
        return deviceId;
    }
    
    // ============================================
    // 10. MANUAL SYNC TRIGGER
    // ============================================
    triggerManualSync() {
        console.log("🔄 Manual sync triggered");
        this.syncData();
        
        // Show notification
        this.showSyncNotification();
    }
    
    // ============================================
    // 11. SHOW SYNC NOTIFICATION
    // ============================================
    showSyncNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #3498db;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideUp 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-sync-alt fa-spin"></i>
            <div>
                <strong>Menyinkronkan data...</strong>
                <div style="font-size:12px;opacity:0.9;">Ke admin dashboard</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // ============================================
    // 12. CLEANUP
    // ============================================
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Global Sync Manager Instance
window.syncManager = new SyncManager();

// Ganti ini di sync-service.js:
this.apiUrl = 'https://pemilu-guru-t4ud.vercel.app/api/sync-vote';
// Atau untuk development:
this.apiUrl = window.location.origin + '/api/sync-vote';