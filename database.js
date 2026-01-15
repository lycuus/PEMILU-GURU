// ============================================
// DATABASE SYSTEM - INDEXEDDB
// ============================================

class VotingDB {
    constructor() {
        this.dbName = 'ElectionSystemDB';
        this.version = 4; // Naikkan versi untuk upgrade schema
        this.db = null;
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('❌ Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ Database initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 Upgrading database...');
                const db = event.target.result;
                
                // Create voters store
                if (!db.objectStoreNames.contains('voters')) {
                    const votersStore = db.createObjectStore('voters', { keyPath: 'id' });
                    votersStore.createIndex('username', 'username', { unique: true });
                    votersStore.createIndex('class', 'class', { unique: false });
                    votersStore.createIndex('has_voted', 'has_voted', { unique: false });
                    votersStore.createIndex('vote_time', 'vote_time', { unique: false });
                    console.log('✅ Created voters store');
                }
                
                // Create candidates store
                if (!db.objectStoreNames.contains('candidates')) {
                    const candidatesStore = db.createObjectStore('candidates', { keyPath: 'id' });
                    candidatesStore.createIndex('number', 'number', { unique: true });
                    candidatesStore.createIndex('votes', 'votes', { unique: false });
                    candidatesStore.createIndex('chairman_name', 'chairman_name', { unique: false });
                    console.log('✅ Created candidates store');
                }
                
                // Create votes store
                if (!db.objectStoreNames.contains('votes')) {
                    const votesStore = db.createObjectStore('votes', { keyPath: 'id', autoIncrement: true });
                    votesStore.createIndex('voter_id', 'voter_id', { unique: true });
                    votesStore.createIndex('candidate_id', 'candidate_id', { unique: false });
                    votesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    votesStore.createIndex('voter_name', 'voter_name', { unique: false });
                    console.log('✅ Created votes store');
                }
                
                // Create admin store
                if (!db.objectStoreNames.contains('admins')) {
                    const adminsStore = db.createObjectStore('admins', { keyPath: 'id' });
                    adminsStore.createIndex('username', 'username', { unique: true });
                    adminsStore.createIndex('role', 'role', { unique: false });
                    console.log('✅ Created admins store');
                }
                
                // Create audit log store (FIX: Tambahkan ini)
                if (!db.objectStoreNames.contains('audit_logs')) {
                    const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('action', 'action', { unique: false });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('user_id', 'user_id', { unique: false });
                    console.log('✅ Created audit logs store');
                }
            };
        });
    }
    
    // ============================================
    // VOTER FUNCTIONS
    // ============================================

    async addVoter(voter) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readwrite');
            const store = transaction.objectStore('voters');
            
            const voterData = {
                ...voter,
                has_voted: false,
                vote_candidate_id: null,
                vote_time: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(voterData);
            
            request.onsuccess = () => {
                console.log('✅ Voter added:', voter.username);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVoterByUsername(username) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('username');
            const request = index.get(username);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVoterById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async updateVoter(voterId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readwrite');
            const store = transaction.objectStore('voters');
            
            const getRequest = store.get(voterId);
            
            getRequest.onsuccess = () => {
                const voter = getRequest.result;
                if (!voter) {
                    reject(new Error('Voter not found'));
                    return;
                }
                
                const updatedVoter = { 
                    ...voter, 
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                const putRequest = store.put(updatedVoter);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Voter updated:', voterId);
                    resolve({ success: true, voter: updatedVoter });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating voter:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAllVoters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voters:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVotersByClass(className) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('class');
            const request = index.getAll(className);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voters by class:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVotedVoters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('has_voted');
            const request = index.getAll(true);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voted voters:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getNotVotedVoters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('has_voted');
            const request = index.getAll(false);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting not voted voters:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteVoter(voterId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readwrite');
            const store = transaction.objectStore('voters');
            const request = store.delete(voterId);
            
            request.onsuccess = () => {
                console.log('✅ Voter deleted:', voterId);
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // CANDIDATE FUNCTIONS
    // ============================================

    async addCandidate(candidate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const candidateData = {
                ...candidate,
                votes: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(candidateData);
            
            request.onsuccess = () => {
                console.log('✅ Candidate added:', candidate.chairman_name);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAllCandidates() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readonly');
            const store = transaction.objectStore('candidates');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const candidates = request.result || [];
                console.log('✅ Candidates loaded:', candidates.length);
                resolve(candidates);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting candidates:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getCandidate(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readonly');
            const store = transaction.objectStore('candidates');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getCandidateByNumber(number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readonly');
            const store = transaction.objectStore('candidates');
            const index = store.index('number');
            const request = index.get(number);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting candidate by number:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async updateCandidate(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const candidate = getRequest.result;
                if (!candidate) {
                    reject(new Error('Candidate not found'));
                    return;
                }
                
                const updatedCandidate = { 
                    ...candidate, 
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                const putRequest = store.put(updatedCandidate);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Candidate updated:', id);
                    resolve({ success: true, candidate: updatedCandidate });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating candidate:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteCandidate(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('✅ Candidate deleted:', id);
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async incrementCandidateVotes(candidateId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const getRequest = store.get(candidateId);
            
            getRequest.onsuccess = () => {
                const candidate = getRequest.result;
                if (!candidate) {
                    reject(new Error('Candidate not found'));
                    return;
                }
                
                candidate.votes = (candidate.votes || 0) + 1;
                candidate.updated_at = new Date().toISOString();
                
                const putRequest = store.put(candidate);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Candidate votes incremented:', candidateId);
                    resolve({ success: true, votes: candidate.votes });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating candidate votes:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async decrementCandidateVotes(candidateId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const getRequest = store.get(candidateId);
            
            getRequest.onsuccess = () => {
                const candidate = getRequest.result;
                if (!candidate) {
                    reject(new Error('Candidate not found'));
                    return;
                }
                
                candidate.votes = Math.max(0, (candidate.votes || 0) - 1);
                candidate.updated_at = new Date().toISOString();
                
                const putRequest = store.put(candidate);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Candidate votes decremented:', candidateId);
                    resolve({ success: true, votes: candidate.votes });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating candidate votes:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

        // ============================================
        // VOTING FUNCTIONS
        // ============================================

        async castVote(voterId, candidateId) {
            return new Promise(async (resolve, reject) => {
                try {
                    const transaction = this.db.transaction(['voters', 'candidates', 'votes', 'audit_logs'], 'readwrite');
                    
                    // Check if voter already voted
                    const votersStore = transaction.objectStore('voters');
                    const getVoterRequest = votersStore.get(voterId);
                    
                    getVoterRequest.onsuccess = () => {
                        const voter = getVoterRequest.result;
                        
                        if (!voter) {
                            reject(new Error('Voter not found'));
                            return;
                        }
                        
                        if (voter.has_voted) {
                            resolve({ 
                                success: false, 
                                already_voted: true, 
                                message: 'Anda sudah melakukan voting sebelumnya.' 
                            });
                            return;
                        }
                        
                        // Update voter as voted
                        voter.has_voted = true;
                        voter.vote_candidate_id = candidateId;
                        voter.vote_time = new Date().toISOString();
                        voter.updated_at = new Date().toISOString();
                        
                        const updateVoterRequest = votersStore.put(voter);
                        
                        updateVoterRequest.onsuccess = () => {
                            console.log('✅ Voter marked as voted:', voterId);
                            
                            // Increment candidate votes
                            const candidatesStore = transaction.objectStore('candidates');
                            const getCandidateRequest = candidatesStore.get(candidateId);
                            
                            getCandidateRequest.onsuccess = () => {
                                const candidate = getCandidateRequest.result;
                                
                                if (!candidate) {
                                    reject(new Error('Candidate not found'));
                                    return;
                                }
                                
                                candidate.votes = (candidate.votes || 0) + 1;
                                candidate.updated_at = new Date().toISOString();
                                
                                const updateCandidateRequest = candidatesStore.put(candidate);
                                
                                updateCandidateRequest.onsuccess = () => {
                                    console.log('✅ Candidate votes incremented:', candidateId);
                                    
                                    // Record vote in votes store
                                    const votesStore = transaction.objectStore('votes');
                                    const voteRecord = {
                                        voter_id: voterId,
                                        candidate_id: candidateId,
                                        timestamp: new Date().toISOString(),
                                        voter_name: voter.name,
                                        candidate_name: candidate.chairman_name,
                                        candidate_number: candidate.number,
                                        voter_class: voter.class
                                    };
                                    
                                    const addVoteRequest = votesStore.add(voteRecord);
                                    
                                    addVoteRequest.onsuccess = () => {
                                        console.log('✅ Vote recorded:', voteRecord);
                                        
                                        // Add audit log
                                        const auditStore = transaction.objectStore('audit_logs');
                                        const auditLog = {
                                            action: 'VOTE_CAST',
                                            user_id: voterId,
                                            user_name: voter.name,
                                            details: `Memilih kandidat ${candidate.number} - ${candidate.chairman_name}`,
                                            timestamp: new Date().toISOString(),
                                            ip_address: 'localhost'
                                        };
                                        
                                        auditStore.add(auditLog);
                                        
                                        transaction.oncomplete = () => {
                                            resolve({ 
                                                success: true, 
                                                timestamp: voter.vote_time,
                                                candidate: candidate.chairman_name,
                                                candidate_number: candidate.number,
                                                votes: candidate.votes,
                                                voter: voter.name,
                                                voter_class: voter.class
                                            });
                                        };
                                    };
                                    
                                    addVoteRequest.onerror = (event) => {
                                        console.error('❌ Error recording vote:', event.target.error);
                                        reject(event.target.error);
                                    };
                                };
                                
                                updateCandidateRequest.onerror = (event) => {
                                    console.error('❌ Error updating candidate:', event.target.error);
                                    reject(event.target.error);
                                };
                            };
                            
                            getCandidateRequest.onerror = (event) => {
                                console.error('❌ Error getting candidate:', event.target.error);
                                reject(event.target.error);
                            };
                        };
                        
                        updateVoterRequest.onerror = (event) => {
                            console.error('❌ Error updating voter:', event.target.error);
                            reject(event.target.error);
                        };
                    };
                    
                    getVoterRequest.onerror = (event) => {
                        console.error('❌ Error getting voter:', event.target.error);
                        reject(event.target.error);
                    };
                    
                } catch (error) {
                    console.error('❌ Error in castVote:', error);
                    reject(error);
                }
            });
        }

        async getAllVotes() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['votes'], 'readonly');
                const store = transaction.objectStore('votes');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                
                request.onerror = (event) => {
                    console.error('❌ Error getting votes:', event.target.error);
                    reject(event.target.error);
                };
            });
        }

        async getVoteByVoterId(voterId) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['votes'], 'readonly');
                const store = transaction.objectStore('votes');
                const index = store.index('voter_id');
                const request = index.get(voterId);
                
                request.onsuccess = () => {
                    resolve(request.result || null);
                };
                
                request.onerror = (event) => {
                    console.error('❌ Error getting vote:', event.target.error);
                    reject(event.target.error);
                };
            });
        }

        async getVotesByCandidateId(candidateId) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['votes'], 'readonly');
                const store = transaction.objectStore('votes');
                const index = store.index('candidate_id');
                const request = index.getAll(candidateId);
                
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                
                request.onerror = (event) => {
                    console.error('❌ Error getting votes by candidate:', event.target.error);
                    reject(event.target.error);
                };
            });
        }

        async getVotesByDate(startDate, endDate) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['votes'], 'readonly');
                const store = transaction.objectStore('votes');
                const index = store.index('timestamp');
                const request = index.getAll();
                
                request.onsuccess = () => {
                    const allVotes = request.result || [];
                    const filteredVotes = allVotes.filter(vote => {
                        const voteDate = new Date(vote.timestamp);
                        return voteDate >= startDate && voteDate <= endDate;
                    });
                    resolve(filteredVotes);
                };
                
                request.onerror = (event) => {
                    console.error('❌ Error getting votes by date:', event.target.error);
                    reject(event.target.error);
                };
            });
        }

        async deleteVote(voteId) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['votes'], 'readwrite');
                const store = transaction.objectStore('votes');
                const request = store.delete(voteId);
                
                request.onsuccess = () => {
                    console.log('✅ Vote deleted:', voteId);
                    resolve({ success: true });
                };
                
                request.onerror = (event) => {
                    console.error('❌ Error deleting vote:', event.target.error);
                    reject(event.target.error);
                };
            });
        }

    // ============================================
    // LOGIN VALIDATION
    // ============================================

    async validateLogin(username) {
        try {
            const voter = await this.getVoterByUsername(username);
            
            if (!voter) {
                return { 
                    success: false, 
                    message: 'Username tidak ditemukan. Gunakan siswa001 sampai siswa107' 
                };
            }
            
            if (voter.has_voted) {
                return {
                    success: false,
                    already_voted: true,
                    message: 'Anda sudah melakukan voting. Anda tidak dapat memilih lagi.',
                    voter: voter
                };
            }
            
            return { 
                success: true, 
                voter: voter
            };
            
        } catch (error) {
            console.error('❌ Error validating login:', error);
            return { 
                success: false, 
                message: 'Terjadi kesalahan saat validasi login' 
            };
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    async resetAllVotes() {
        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db.transaction(['voters', 'candidates', 'votes', 'audit_logs'], 'readwrite');
                
                // Reset all voters
                const votersStore = transaction.objectStore('voters');
                const votersRequest = votersStore.openCursor();
                
                votersRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.value.has_voted = false;
                        cursor.value.vote_candidate_id = null;
                        cursor.value.vote_time = null;
                        cursor.value.updated_at = new Date().toISOString();
                        cursor.update(cursor.value);
                        cursor.continue();
                    }
                };
                
                // Reset all candidates votes
                const candidatesStore = transaction.objectStore('candidates');
                const candidatesRequest = candidatesStore.openCursor();
                
                candidatesRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.value.votes = 0;
                        cursor.value.updated_at = new Date().toISOString();
                        cursor.update(cursor.value);
                        cursor.continue();
                    }
                };
                
                // Clear all votes
                const votesStore = transaction.objectStore('votes');
                const clearVotesRequest = votesStore.clear();
                
                // Add audit log
                const auditStore = transaction.objectStore('audit_logs');
                const auditLog = {
                    action: 'RESET_ALL_VOTES',
                    user_id: 'admin',
                    user_name: 'System Admin',
                    details: 'Reset semua data voting',
                    timestamp: new Date().toISOString(),
                    ip_address: 'localhost'
                };
                auditStore.add(auditLog);
                
                clearVotesRequest.onsuccess = () => {
                    transaction.oncomplete = () => {
                        console.log('✅ All votes reset successfully');
                        resolve({ success: true });
                    };
                };
                
                clearVotesRequest.onerror = (event) => {
                    console.error('❌ Error clearing votes:', event.target.error);
                    reject(event.target.error);
                };
                
            } catch (error) {
                console.error('❌ Error resetting votes:', error);
                reject(error);
            }
        });
    }

    async resetSingleVote(voterId) {
        return new Promise(async (resolve, reject) => {
            try {
                const voter = await this.getVoterById(voterId);
                if (!voter) {
                    reject(new Error('Voter not found'));
                    return;
                }
                
                if (!voter.has_voted) {
                    resolve({ success: true, message: 'Voter belum memilih' });
                    return;
                }
                
                const candidateId = voter.vote_candidate_id;
                
                const transaction = this.db.transaction(['voters', 'candidates', 'votes', 'audit_logs'], 'readwrite');
                
                // Reset voter
                voter.has_voted = false;
                voter.vote_candidate_id = null;
                voter.vote_time = null;
                voter.updated_at = new Date().toISOString();
                
                const votersStore = transaction.objectStore('voters');
                votersStore.put(voter);
                
                // Decrement candidate votes
                if (candidateId) {
                    const candidatesStore = transaction.objectStore('candidates');
                    const getCandidateRequest = candidatesStore.get(candidateId);
                    
                    getCandidateRequest.onsuccess = () => {
                        const candidate = getCandidateRequest.result;
                        if (candidate) {
                            candidate.votes = Math.max(0, (candidate.votes || 0) - 1);
                            candidate.updated_at = new Date().toISOString();
                            candidatesStore.put(candidate);
                        }
                    };
                }
                
                // Delete vote record
                const votesStore = transaction.objectStore('votes');
                const voteIndex = votesStore.index('voter_id');
                const getVoteRequest = voteIndex.get(voterId);
                
                getVoteRequest.onsuccess = () => {
                    const vote = getVoteRequest.result;
                    if (vote) {
                        votesStore.delete(vote.id);
                    }
                };
                
                // Add audit log
                const auditStore = transaction.objectStore('audit_logs');
                const auditLog = {
                    action: 'RESET_SINGLE_VOTE',
                    user_id: 'admin',
                    user_name: 'System Admin',
                    details: `Reset vote untuk voter: ${voter.name} (ID: ${voterId})`,
                    timestamp: new Date().toISOString(),
                    ip_address: 'localhost'
                };
                auditStore.add(auditLog);
                
                transaction.oncomplete = () => {
                    console.log('✅ Single vote reset:', voterId);
                    resolve({ success: true });
                };
                
            } catch (error) {
                console.error('❌ Error resetting single vote:', error);
                reject(error);
            }
        });
    }

    async getElectionStats() {
        return new Promise(async (resolve, reject) => {
            try {
                const [voters, candidates, votes] = await Promise.all([
                    this.getAllVoters(),
                    this.getAllCandidates(),
                    this.getAllVotes()
                ]);
                
                const totalVoters = voters.length;
                const votedVoters = voters.filter(v => v.has_voted).length;
                const notVotedVoters = totalVoters - votedVoters;
                const votePercentage = totalVoters > 0 ? (votedVoters / totalVoters * 100).toFixed(1) : 0;
                
                // Get votes by class
                const votesByClass = {};
                voters.forEach(voter => {
                    if (voter.has_voted) {
                        if (!votesByClass[voter.class]) {
                            votesByClass[voter.class] = { total: 0, voted: 0 };
                        }
                        votesByClass[voter.class].total++;
                        votesByClass[voter.class].voted++;
                    } else {
                        if (!votesByClass[voter.class]) {
                            votesByClass[voter.class] = { total: 0, voted: 0 };
                        }
                        votesByClass[voter.class].total++;
                    }
                });
                
                // Calculate voting time statistics
                const voteTimes = votes.map(v => new Date(v.timestamp).getTime()).sort();
                const averageVoteTime = voteTimes.length > 0 
                    ? new Date(Math.round(voteTimes.reduce((a, b) => a + b, 0) / voteTimes.length))
                    : null;
                
                const firstVote = voteTimes.length > 0 ? new Date(voteTimes[0]) : null;
                const lastVote = voteTimes.length > 0 ? new Date(voteTimes[voteTimes.length - 1]) : null;
                
                resolve({
                    totalVoters,
                    votedVoters,
                    notVotedVoters,
                    votePercentage,
                    totalCandidates: candidates.length,
                    totalVotes: votes.length,
                    averageVoteTime,
                    firstVote,
                    lastVote,
                    votesByClass,
                    candidates: candidates.map(c => ({
                        id: c.id,
                        name: c.chairman_name,
                        number: c.number,
                        votes: c.votes || 0,
                        percentage: votedVoters > 0 ? ((c.votes || 0) / votedVoters * 100).toFixed(1) : 0,
                        vice_chairman: c.vice_chairman_name,
                        motto: c.motto,
                        class: c.chairman_class
                    })).sort((a, b) => b.votes - a.votes)
                });
                
            } catch (error) {
                console.error('❌ Error getting stats:', error);
                reject(error);
            }
        });
    }

    async getVotingStatus(voterId) {
        try {
            const voter = await this.getVoterById(voterId);
            if (!voter) {
                return { error: 'Voter not found' };
            }
            
            let voteDetails = null;
            if (voter.has_voted) {
                const vote = await this.getVoteByVoterId(voterId);
                const candidate = vote ? await this.getCandidate(vote.candidate_id) : null;
                
                voteDetails = {
                    voted_at: voter.vote_time,
                    candidate: candidate ? {
                        id: candidate.id,
                        name: candidate.chairman_name,
                        number: candidate.number
                    } : null
                };
            }
            
            return {
                voter: {
                    id: voter.id,
                    name: voter.name,
                    username: voter.username,
                    class: voter.class,
                    has_voted: voter.has_voted
                },
                vote: voteDetails
            };
            
        } catch (error) {
            console.error('❌ Error getting voting status:', error);
            throw error;
        }
    }

    async exportVotingData() {
        try {
            const [voters, candidates, votes, auditLogs] = await Promise.all([
                this.getAllVoters(),
                this.getAllCandidates(),
                this.getAllVotes(),
                this.getAllAuditLogs()
            ]);
            
            const stats = await this.getElectionStats();
            
            const exportData = {
                metadata: {
                    export_date: new Date().toISOString(),
                    system: "Election System Database",
                    version: "1.0"
                },
                statistics: stats,
                voters: voters,
                candidates: candidates,
                votes: votes,
                audit_logs: auditLogs
            };
            
            return exportData;
            
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            throw error;
        }
    }

    // ============================================
    // AUDIT LOG FUNCTIONS - DIPERBAIKI
    // ============================================

    async addAuditLog(log) {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found, skipping audit log');
                resolve({ success: false, message: 'Audit log store not available' });
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readwrite');
            const store = transaction.objectStore('audit_logs');
            
            const logData = {
                ...log,
                timestamp: new Date().toISOString()
            };
            
            const request = store.add(logData);
            
            request.onsuccess = () => {
                console.log('✅ Audit log added:', log.action);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding audit log:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAllAuditLogs() {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found');
                resolve([]);
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readonly');
            const store = transaction.objectStore('audit_logs');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting audit logs:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAuditLogsByAction(action) {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found');
                resolve([]);
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readonly');
            const store = transaction.objectStore('audit_logs');
            const index = store.index('action');
            const request = index.getAll(action);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting audit logs by action:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async clearAuditLogs() {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found');
                resolve({ success: true });
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readwrite');
            const store = transaction.objectStore('audit_logs');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('✅ Audit logs cleared');
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error clearing audit logs:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // ADMIN MANAGEMENT - DIPERBAIKI
    // ============================================

    async getAllAdmins() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readonly');
            const store = transaction.objectStore('admins');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting admins:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async addAdmin(admin) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readwrite');
            const store = transaction.objectStore('admins');
            
            const adminData = {
                ...admin,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(adminData);
            
            request.onsuccess = () => {
                console.log('✅ Admin added:', admin.username);
                
                // Tambahkan audit log jika store tersedia
                if (this.db.objectStoreNames.contains('audit_logs')) {
                    const auditTransaction = this.db.transaction(['audit_logs'], 'readwrite');
                    const auditStore = auditTransaction.objectStore('audit_logs');
                    const auditLog = {
                        action: 'ADMIN_ADDED',
                        user_id: 'system',
                        user_name: 'System',
                        details: `Admin baru ditambahkan: ${admin.username}`,
                        timestamp: new Date().toISOString(),
                        ip_address: 'localhost'
                    };
                    auditStore.add(auditLog);
                }
                
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding admin:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async validateAdminLogin(username, password) {
        try {
            const admins = await this.getAllAdmins();
            const admin = admins.find(a => a.username === username);
            
            if (!admin) {
                return { success: false, message: 'Username admin tidak ditemukan' };
            }
            
            if (admin.password !== password) {
                return { success: false, message: 'Password salah' };
            }
            
            // Add audit log for successful login jika store tersedia
            try {
                await this.addAuditLog({
                    action: 'ADMIN_LOGIN',
                    user_id: admin.id,
                    user_name: admin.name,
                    details: 'Admin login berhasil',
                    ip_address: 'localhost'
                });
            } catch (auditError) {
                console.warn('⚠️ Audit log skipped:', auditError.message);
            }
            
            return { 
                success: true, 
                admin: {
                    id: admin.id,
                    username: admin.username,
                    name: admin.name,
                    role: admin.role,
                    permissions: admin.permissions || ['view', 'edit', 'delete', 'reset']
                }
            };
            
        } catch (error) {
            console.error('❌ Error validating admin login:', error);
            return { success: false, message: 'Terjadi kesalahan saat validasi login' };
        }
    }

    async updateAdmin(adminId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readwrite');
            const store = transaction.objectStore('admins');
            
            const getRequest = store.get(adminId);
            
            getRequest.onsuccess = () => {
                const admin = getRequest.result;
                if (!admin) {
                    reject(new Error('Admin not found'));
                    return;
                }
                
                const updatedAdmin = { 
                    ...admin, 
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                const putRequest = store.put(updatedAdmin);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Admin updated:', adminId);
                    
                    // Tambahkan audit log jika store tersedia
                    if (this.db.objectStoreNames.contains('audit_logs')) {
                        const auditTransaction = this.db.transaction(['audit_logs'], 'readwrite');
                        const auditStore = auditTransaction.objectStore('audit_logs');
                        const auditLog = {
                            action: 'ADMIN_UPDATED',
                            user_id: 'system',
                            user_name: 'System',
                            details: `Admin diperbarui: ${admin.username}`,
                            timestamp: new Date().toISOString(),
                            ip_address: 'localhost'
                        };
                        auditStore.add(auditLog);
                    }
                    
                    resolve({ success: true, admin: updatedAdmin });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating admin:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting admin:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteAdmin(adminId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readwrite');
            const store = transaction.objectStore('admins');
            
            const getRequest = store.get(adminId);
            
            getRequest.onsuccess = () => {
                const admin = getRequest.result;
                if (!admin) {
                    reject(new Error('Admin not found'));
                    return;
                }
                
                const deleteRequest = store.delete(adminId);
                
                deleteRequest.onsuccess = () => {
                    console.log('✅ Admin deleted:', adminId);
                    
                    // Tambahkan audit log jika store tersedia
                    if (this.db.objectStoreNames.contains('audit_logs')) {
                        const auditTransaction = this.db.transaction(['audit_logs'], 'readwrite');
                        const auditStore = auditTransaction.objectStore('audit_logs');
                        const auditLog = {
                            action: 'ADMIN_DELETED',
                            user_id: 'system',
                            user_name: 'System',
                            details: `Admin dihapus: ${admin.username}`,
                            timestamp: new Date().toISOString(),
                            ip_address: 'localhost'
                        };
                        auditStore.add(auditLog);
                    }
                    
                    resolve({ success: true });
                };
                
                deleteRequest.onerror = (event) => {
                    console.error('❌ Error deleting admin:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting admin:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // INITIALIZATION FUNCTIONS
    // ============================================

    async initializeSampleData() {
        console.log('🔄 Initializing sample data...');
        
        try {
            // Check if candidates already exist
            const existingCandidates = await this.getAllCandidates();
            
            if (existingCandidates.length === 0) {
                // Add sample candidates
                const sampleCandidates = 
                    [
                    {
                        id: 1,
                        number: 1,
                        chairman_name: "MUHAMAD FADLAN ARFANI",
                        chairman_class: "XI C",
                        motto: "Bersama Membangun Prestasi",
                        tags: ["Ganteng", "Prestasi", "Loyalitas"],
                        vision: "Mewujudkan OSSIP yang inovatif, aspiratif, dan berprestasi di tingkat regional dengan mengedepankan transparansi dan partisipasi aktif seluruh siswa.",
                        mission: [
                            "Meningkatkan kualitas kegiatan ekstrakurikuler",
                            "Memperkuat komunikasi antara siswa dan pihak sekolah",
                            "Mengembangkan program kreatif dan inovatif"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/32.jpg",
                        image_vice_chairman: "https://randomuser.me/api/portraits/men/33.jpg",
                        votes: 0
                    }, // <--- INI AMAN
                    {
                        id: 2,
                        number: 2,
                        chairman_name: "PRAMUDITA AULADI",
                        chairman_class: "XI C",
                        motto: "Kreatif, Inovatif, dan Kolaboratif",
                        tags: ["Kreatif", "Kolaborasi", "Aspiratif"],
                        vision: "Menjadikan OSSIP sebagai wadah pengembangan potensi siswa secara maksimal melalui program kreatif, inovatif, dan kolaboratif dengan seluruh elemen sekolah.",
                        mission: [
                            "Menciptakan lingkungan belajar yang nyaman",
                            "Mengadakan event kreatif tahunan",
                            "Membangun sistem aspirasi siswa yang efektif"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/women/44.jpg",
                        image_vice_chairman: "https://randomuser.me/api/portraits/women/45.jpg",
                        votes: 0
                    }, // <--- INI AMAN
                    {
                        id: 3,
                        number: 3,
                        chairman_name: "DHARMA ALIF SAPUTRA",
                        chairman_class: "XI D",
                        motto: "Satu untuk Semua, Semua untuk Satu",
                        tags: ["Solidaritas", "Transparan", "Fleksibel"],
                        vision: "Membentuk OSIS yang solid, transparan, dan berorientasi pada kebutuhan siswa dengan mengutamakan prinsip gotong royong dan kebersamaan.",
                        mission: [
                            "Meningkatkan solidaritas antar siswa",
                            "Menerapkan sistem kerja yang transparan",
                            "Responsif terhadap kebutuhan siswa"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/65.jpg",
                        votes: 0
                    }, 
                    
                    {
                        id: 4,
                        number: 1,
                        chairman_name: "AMRELINA",
                        chairman_class: "XI C",
                        motto: "Satu untuk Semua, Semua untuk Satu",
                        tags: ["Solidaritas", "Transparan", "Fleksibel"],
                        vision: "Menjadikan organisasi santri Insan Pratama 2 sebagai organisasi yang aktif, disiplin, dan bertanggung jawab dalam membentuk santri yang berakhlak baik, berprestasi, serta menjunjung tinggi nilai – nilai islam dan budaya pesantren",
                        mission: [
                            "Meningkatkan keamanan dan ketakwaan santri melalui kegiatan keagamaan",
                            "Menumbuhkan rasa kebersamaan persaudaraan dan kepedulian sosial",
                            "Membentuk karakter santri yang disiplin, sopan, dan bertanggung jawab"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/65.jpg",
                        votes: 0
                    }, // <--- ERROR NYA TADI DISINI JUGA (Kurang "},")
                    {
                        id: 5,
                        number: 3,
                        chairman_name: "KHOLIDAH IZZATI",
                        chairman_class: "XI D",
                        motto: "Satu untuk Semua, Semua untuk Satu",
                        tags: ["Solidaritas", "Transparan", "Fleksibel"],
                        vision: "Mewujudkan lingkungan smaq insan pratama yang harmonis, kreatif, dan penuh semangat kebersamaan sehingga setiap santri dapat berkembang secara akademik spiritual, dan social",
                        mission: [
                            "Meningkatkan kualitas organisasi melalui program-program kreatif dan positif yang bermanfaat untuk semua santri ",
                            "Mendorong partisipasi aktif santri dalam kegiatan ossip, agar suara setiap santri terdengar dan di hargai",
                            "Membina budaya kebersamaan dan kepeduliaan antar santri melalui kegiatan sehari-hari "
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/65.jpg",
                        votes: 0
                    }, // <--- ERROR NYA TADI DISINI JUGA (Kurang "},")
                    {
                        id: 6,
                        number: 3,
                        chairman_name: "NAVA AISILA HASNA",
                        chairman_class: "XI D",
                        motto: "Satu untuk Semua, Semua untuk Satu",
                        tags: ["Solidaritas", "Transparan", "Fleksibel"],
                        vision: "Membentuk OSIS yang solid, transparan, dan berorientasi pada kebutuhan siswa dengan mengutamakan prinsip gotong royong dan kebersamaan.",
                        mission: [
                            "Meningkatkan solidaritas antar siswa",
                            "Menerapkan sistem kerja yang transparan",
                            "Responsif terhadap kebutuhan siswa"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/65.jpg",
                        votes: 0
                    }
                ];
                
                for (const candidate of sampleCandidates) {
                    await this.addCandidate(candidate);
                }
                
                console.log('✅ Sample candidates added');
            }
            
            // Check if voters already exist
            const existingVoters = await this.getAllVoters();
            
            if (existingVoters.length === 0) {
                // Generate 107 students
                await this.generateAllStudents();
                console.log('✅ 107 students generated');
            }
            
            // Check if admin exists
            const existingAdmins = await this.getAllAdmins();
            
            if (existingAdmins.length === 0) {
                await this.addAdmin({
                    id: 1,
                    username: "admin",
                    password: "admin123",
                    name: "Admin Panitia",
                    role: "super_admin",
                    permissions: ["view", "edit", "delete", "reset", "export", "audit"],
                    email: "admin@school.edu",
                    phone: "081234567890"
                });
                
                await this.addAdmin({
                    id: 2,
                    username: "panitia",
                    password: "panitia123",
                    name: "Panitia Pemilihan",
                    role: "admin",
                    permissions: ["view", "reset"],
                    email: "panitia@school.edu",
                    phone: "081234567891"
                });
                
                console.log('✅ Admin users added');
            }
            
            console.log('✅ Sample data initialization complete');
            
        } catch (error) {
            console.error('❌ Error initializing sample data:', error);
        }
    }

    async generateAllStudents() {
        const students = 
    [
    { id: 1, username: "guru01", name: "Faizzuddin Prawiranegara", class: "diknas" },
    { id: 2, username: "guru02", name: "Rohemi", class: "diknas" },
    { id: 3, username: "guru03", name: "Anis Fuad", class: "diknas" },
    { id: 4, username: "guru04", name: "Helmi Agustian", class: "diknas" },
    { id: 5, username: "guru05", name: "Murni", class: "diknas" },
    { id: 6, username: "guru06", name: "Siti Roudotul Fadillah", class: "diknas" },
    { id: 7, username: "guru07", name: "Vinka Nur Octaviani", class: "diknas" },
    { id: 8, username: "guru08", name: "Iptikarul Ilmi", class: "diknas" },
    { id: 9, username: "guru09", name: "Mutamimah", class: "diknas" },
    { id: 10, username: "guru10", name: "Febi Rizki Anisah", class: "diknas" }, // NAMA DIPERBAIKI
    { id: 11, username: "guru11", name: "Pipit Eka Kurniawati", class: "diknas" },
    { id: 12, username: "guru12", name: "Nurhikmatul Aliyah", class: "diknas" },
    { id: 13, username: "guru13", name: "Istiqomah Cahyani", class: "diknas" },
    { id: 14, username: "guru14", name: "Sutisna", class: "diknas" },
    { id: 15, username: "guru15", name: "Nadiyah Aulia Rahmah", class: "diknas" },
    { id: 16, username: "guru16", name: "Aji Sukma Iqbal Najibulloh", class: "diknas" },

    // UNIT PENGASUHAN (9 guru) - ID 17-25
    { id: 17, username: "guru17", name: "Iwan Gunawan", class: "pengasuhan" },
    { id: 18, username: "guru18", name: "Tb Sultan Mardotillah", class: "pengasuhan" },
    { id: 19, username: "guru19", name: "Ust Atif Media", class: "pengasuhan" },
    { id: 20, username: "guru20", name: "Windi", class: "pengasuhan" },
    { id: 21, username: "guru21", name: "Wulan", class: "pengasuhan" },
    { id: 22, username: "guru22", name: "Muhammad Yahya Ayas", class: "pengasuhan" },
    { id: 23, username: "guru23", name: "Asep", class: "pengasuhan" },
    { id: 24, username: "guru24", name: "Afni", class: "pengasuhan" },
    { id: 25, username: "guru25", name: "Nur Indah Fitriana", class: "pengasuhan" },

    // UNIT TAHFIDZ (6 guru) - ID 26-31
    { id: 26, username: "guru26", name: "Mahrus Sholeh", class: "tahfidz" },
    { id: 27, username: "guru27", name: "Restu", class: "tahfidz" },
    { id: 28, username: "guru28", name: "Jihan", class: "tahfidz" },
    { id: 29, username: "guru29", name: "Arruh", class: "tahfidz" },
    { id: 30, username: "guru30", name: "Diki amarullah", class: "tahfidz" },
    { id: 31, username: "guru31", name: "Novi", class: "tahfidz" }
]
        
        for (const student of students) {
            await this.addVoter({
                id: student.id,
                username: student.username,
                name: student.name,
                class: student.class,
                has_voted: false,
                vote_candidate_id: null,
                vote_time: null
            });
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    async clearDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('✅ Database deleted successfully');
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting database:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async backupDatabase() {
        try {
            const allData = await this.exportVotingData();
            const backup = {
                timestamp: new Date().toISOString(),
                data: allData
            };
            
            // Convert to JSON string
            const backupString = JSON.stringify(backup, null, 2);
            
            // Create download link
            const blob = new Blob([backupString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `election_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Add audit log
            await this.addAuditLog({
                action: 'DATABASE_BACKUP',
                user_id: 'system',
                user_name: 'System',
                details: 'Database backup created',
                ip_address: 'localhost'
            });
            
            return { success: true, filename: a.download };
            
        } catch (error) {
            console.error('❌ Error backing up database:', error);
            throw error;
        }
    }

    async restoreDatabase(backupData) {
        try {
            // Clear existing data
            await this.clearDatabase();
            
            // Reinitialize database
            await this.initDB();
            
            // Restore data
            const data = backupData.data;
            
            // Restore voters
            for (const voter of data.voters) {
                await this.addVoter(voter);
            }
            
            // Restore candidates
            for (const candidate of data.candidates) {
                await this.addCandidate(candidate);
            }
            
            // Restore votes
            for (const vote of data.votes) {
                const transaction = this.db.transaction(['votes'], 'readwrite');
                const store = transaction.objectStore('votes');
                await new Promise((resolve, reject) => {
                    const request = store.add(vote);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
            
            // Restore admins
            for (const admin of (data.admins || [])) {
                await this.addAdmin(admin);
            }
            
            // Add audit log
            await this.addAuditLog({
                action: 'DATABASE_RESTORE',
                user_id: 'system',
                user_name: 'System',
                details: 'Database restored from backup',
                ip_address: 'localhost'
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error restoring database:', error);
            throw error;
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    async clearDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('✅ Database deleted successfully');
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting database:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async backupDatabase() {
        try {
            const allData = await this.exportVotingData();
            const backup = {
                timestamp: new Date().toISOString(),
                data: allData
            };
            
            // Convert to JSON string
            const backupString = JSON.stringify(backup, null, 2);
            
            // Create download link
            const blob = new Blob([backupString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `election_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Add audit log
            await this.addAuditLog({
                action: 'DATABASE_BACKUP',
                user_id: 'system',
                user_name: 'System',
                details: 'Database backup created',
                ip_address: 'localhost'
            });
            
            return { success: true, filename: a.download };
            
        } catch (error) {
            console.error('❌ Error backing up database:', error);
            throw error;
        }
    }

    async restoreDatabase(backupData) {
        try {
            // Clear existing data
            await this.clearDatabase();
            
            // Reinitialize database
            await this.initDB();
            
            // Restore data
            const data = backupData.data;
            
            // Restore voters
            for (const voter of data.voters) {
                await this.addVoter(voter);
            }
            
            // Restore candidates
            for (const candidate of data.candidates) {
                await this.addCandidate(candidate);
            }
            
            // Restore votes
            for (const vote of data.votes) {
                const transaction = this.db.transaction(['votes'], 'readwrite');
                const store = transaction.objectStore('votes');
                await new Promise((resolve, reject) => {
                    const request = store.add(vote);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
            
            // Restore admins
            for (const admin of (data.admins || [])) {
                await this.addAdmin(admin);
            }
            
            // Add audit log
            await this.addAuditLog({
                action: 'DATABASE_RESTORE',
                user_id: 'system',
                user_name: 'System',
                details: 'Database restored from backup',
                ip_address: 'localhost'
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error restoring database:', error);
            throw error;
        }
    }

    // ============================================
    // HELPER FUNCTIONS FOR UI
    // ============================================

    async getVotingStatistics() {
        return await this.getElectionStats();
    }

    async getAllVotedVoters() {
        return await this.getVotedVoters();
    }

    async getAllNotVotedVoters() {
        return await this.getNotVotedVoters();
    }

    async getVotingStatus(voterId) {
        return await this.getVotingStatus(voterId);
    }

    async resetAllVotesWithConfirmation() {
        // This function would typically show a confirmation dialog
        // For now, just call resetAllVotes
        return await this.resetAllVotes();
    }

    async exportVotingDataToCSV() {
        try {
            const data = await this.exportVotingData();
            
            // Convert to CSV format
            let csv = 'Data,Count\n';
            csv += `Total Voters,${data.statistics.totalVoters}\n`;
            csv += `Voted Voters,${data.statistics.votedVoters}\n`;
            csv += `Not Voted,${data.statistics.notVotedVoters}\n`;
            csv += `Vote Percentage,${data.statistics.votePercentage}%\n`;
            csv += `Total Candidates,${data.statistics.totalCandidates}\n\n`;
            
            csv += 'Candidate Results\n';
            csv += 'Number,Name,Votes,Percentage\n';
            data.statistics.candidates.forEach(candidate => {
                csv += `${candidate.number},${candidate.name},${candidate.votes},${candidate.percentage}%\n`;
            });
            
            csv += '\nVotes by Class\n';
            csv += 'Class,Total,Voted,Percentage\n';
            Object.keys(data.statistics.votesByClass).forEach(className => {
                const classData = data.statistics.votesByClass[className];
                const percentage = classData.total > 0 ? ((classData.voted / classData.total) * 100).toFixed(1) : 0;
                csv += `${className},${classData.total},${classData.voted},${percentage}%\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `election_results_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return { success: true, filename: a.download };
            
        } catch (error) {
            console.error('❌ Error exporting CSV:', error);
            throw error;
        }
    }

    // ============================================
    // DATABASE HEALTH CHECK
    // ============================================

    async checkDatabaseHealth() {
        try {
            const storeNames = Array.from(this.db.objectStoreNames);
            console.log('📊 Database stores:', storeNames);
            
            const health = {
                stores: storeNames,
                voters: await this.getAllVoters().then(v => v.length).catch(() => 0),
                candidates: await this.getAllCandidates().then(c => c.length).catch(() => 0),
                admins: await this.getAllAdmins().then(a => a.length).catch(() => 0),
                votes: await this.getAllVotes().then(v => v.length).catch(() => 0),
                audit_logs: await this.getAllAuditLogs().then(a => a.length).catch(() => 0)
            };
            
            return {
                healthy: true,
                details: health
            };
            
        } catch (error) {
            console.error('❌ Database health check failed:', error);
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    async repairDatabase() {
        try {
            console.log('🔧 Attempting to repair database...');
            
            // Backup data first
            const backup = await this.exportVotingData();
            
            // Clear and recreate database
            await this.clearDatabase();
            
            // Reinitialize
            await this.initDB();
            
            // Restore data
            await this.initializeSampleData();
            
            // Add repair audit log
            await this.addAuditLog({
                action: 'DATABASE_REPAIR',
                user_id: 'system',
                user_name: 'System',
                details: 'Database repaired successfully',
                ip_address: 'localhost'
            });
            
            console.log('✅ Database repair completed');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Database repair failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// ============================================
// GLOBAL INITIALIZATION
// ============================================

// Initialize database globally
window.db = new VotingDB();

// Auto-initialize sample data when database is ready
window.db.initDB().then(async () => {
    console.log('✅ Database ready, initializing sample data...');
    await window.db.initializeSampleData();
    
    // Check database health
    const health = await window.db.checkDatabaseHealth();
    console.log('🏥 Database health:', health);
    
    // Export additional helper functions
    window.db.getAllVoters = window.db.getAllVoters.bind(window.db);
    window.db.resetAllVotes = window.db.resetAllVotes.bind(window.db);
    window.db.validateLogin = window.db.validateLogin.bind(window.db);
    window.db.castVote = window.db.castVote.bind(window.db);
    window.db.getElectionStats = window.db.getElectionStats.bind(window.db);
    window.db.validateAdminLogin = window.db.validateAdminLogin.bind(window.db);
    window.db.exportVotingData = window.db.exportVotingData.bind(window.db);
    window.db.exportVotingDataToCSV = window.db.exportVotingDataToCSV.bind(window.db);
    window.db.backupDatabase = window.db.backupDatabase.bind(window.db);
    window.db.clearDatabase = window.db.clearDatabase.bind(window.db);
    window.db.checkDatabaseHealth = window.db.checkDatabaseHealth.bind(window.db);
    window.db.repairDatabase = window.db.repairDatabase.bind(window.db);
    
    console.log('🚀 Database system ready!');
    console.log('📊 Available functions:', Object.keys(window.db).filter(key => typeof window.db[key] === 'function'));

            // Di database.js, setelah window.db = new VotingDB();
        console.log('VotingDB instance created:', window.db);

        // Di dalam getElectionStats(), tambahkan:
        console.log('getElectionStats called');
    
    // Dispatch event that database is ready
    document.dispatchEvent(new CustomEvent('databaseReady'));
    
}).catch(error => {
    console.error('❌ Database initialization failed:', error);
    
    // Try to repair database
    if (window.db && window.db.repairDatabase) {
        console.log('🔄 Attempting auto-repair...');
        window.db.repairDatabase().then(result => {
            if (result.success) {
                console.log('✅ Database auto-repair successful');
                location.reload();
            } else {
                console.error('❌ Auto-repair failed');
                alert('Database initialization failed. Please clear browser data and refresh the page.');
            }
        });
    } else {
        alert('Database initialization failed. Please clear browser data and refresh the page.');
    }
});

// Export to global scope for debugging
if (typeof window !== 'undefined') {
    window.VotingDB = VotingDB;
}

// Fungsi untuk mendapatkan semua kandidat
window.db.getAllCandidates = function() {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = this.db.transaction(['candidates'], 'readonly');
        const store = transaction.objectStore('candidates');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

// Fungsi untuk menambah kandidat
window.db.addCandidate = function(candidate) {
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['candidates'], 'readwrite');
        const store = transaction.objectStore('candidates');
        
        // Cek apakah kandidat sudah ada
        const getRequest = store.get(candidate.id);
        getRequest.onsuccess = () => {
            if (getRequest.result) {
                resolve(false); // Sudah ada
            } else {
                const addRequest = store.add(candidate);
                addRequest.onsuccess = () => resolve(true);
                addRequest.onerror = () => reject(addRequest.error);
            }
        };
    });
};

// Fungsi untuk update kandidat
window.db.updateCandidate = function(id, updates) {
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['candidates'], 'readwrite');
        const store = transaction.objectStore('candidates');
        
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const candidate = getRequest.result;
            if (candidate) {
                Object.assign(candidate, updates);
                const putRequest = store.put(candidate);
                putRequest.onsuccess = () => resolve(true);
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject('Candidate not found');
            }
        };
    });
};

// Fungsi untuk mencatat transaksi vote
window.db.recordVote = function(voteData) {
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['votes'], 'readwrite');
        const store = transaction.objectStore('votes');
        const request = store.add(voteData);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

