import axios from 'axios';
import { API } from '../../../types.js';
import { apiService } from '../../../services/apiService.js';

export const legalService = {
    // --- Case Management ---
    _listeners: [],

    subscribe(callback) {
        if (typeof callback === 'function') {
            this._listeners.push(callback);
        }
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    },

    notifyListeners() {
        this.getCases().then(cases => {
            this._listeners.forEach(cb => {
                try {
                    cb(cases);
                } catch (e) {
                    console.error("[LegalService] Listener notification failed", e);
                }
            });
        }).catch(err => console.error("[LegalService] Error notifying listeners", err));
    },

    async getCases() {
        try {
            const projects = await apiService.getProjects();
            return Array.isArray(projects) ? projects.filter(p => p.isLegalCase) : [];
        } catch (e) {
            console.error("[LegalService] Error getting cases from backend", e);
            return [];
        }
    },

    async createCase(caseData) {
        try {
            const newCasePayload = { 
                ...caseData,
                // Backend requires 'name' field — modal sends 'title', so map it
                name: caseData.name || caseData.title || 'Untitled Case',
                isLegalCase: true, 
                status: 'Active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const created = await apiService.createProject(newCasePayload);
            await this.addActivity(`Created case: ${caseData.title || caseData.name || 'Untitled'}`, 'case');
            this.notifyListeners();
            return created;
        } catch (e) {
            console.error("[LegalService] Error creating case on backend", e);
            throw e;
        }
    },

    async updateCase(id, updates) {
        try {
            const response = await apiService.updateProject(id, {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            this.notifyListeners();
            return response;
        } catch (e) {
            console.error("[LegalService] Error updating case on backend", e);
            throw e;
        }
    },

    async deleteCase(id) {
        try {
            const response = await apiService.deleteProject(id);
            this.notifyListeners();
            return response;
        } catch (e) {
            console.error("[LegalService] Error deleting case on backend", e);
            throw e;
        }
    },

    // --- Hearing Management ---
    async getHearings() {
        try {
            const cases = await this.getCases();
            const allHearings = [];
            cases.forEach(c => {
                if (Array.isArray(c.hearings)) {
                    c.hearings.forEach(h => {
                        allHearings.push({ 
                            ...h, 
                            caseId: c._id || c.id,
                            caseTitle: c.name || c.title || h.caseTitle 
                        });
                    });
                }
            });
            return allHearings;
        } catch (e) {
            console.error("[LegalService] Error getting hearings", e);
            return [];
        }
    },

    async getHistoryHearings() {
        const hearings = await this.getHearings();
        return hearings.filter(h => h.status?.toLowerCase() === 'completed' || h.status?.toLowerCase() === 'adjourned');
    },

    async addHearing(hearingData) {
        try {
            const cases = await this.getCases();
            const targetCase = cases.find(c => c._id === hearingData.caseId || c.id === hearingData.caseId || c.name === hearingData.caseTitle || c.title === hearingData.caseTitle);
            if (!targetCase) {
                throw new Error("Target case not found for the hearing");
            }
            const newHearing = { 
                ...hearingData, 
                id: Date.now().toString(), 
                status: 'scheduled', 
                aiPrep: Math.floor(Math.random() * 50) + 50 
            };
            const existing = targetCase.hearings || [];
            await apiService.updateProject(targetCase._id, {
                ...targetCase,
                hearings: [...existing, newHearing]
            });
            await this.addActivity(`Scheduled hearing for: ${targetCase.name || targetCase.title}`, 'hearing');
            this.notifyListeners();
            return newHearing;
        } catch (e) {
            console.error("[LegalService] Error adding hearing", e);
            throw e;
        }
    },

    async updateHearing(id, updates) {
        try {
            const cases = await this.getCases();
            let targetCase = null;
            let targetHearing = null;
            for (const c of cases) {
                if (Array.isArray(c.hearings)) {
                    const found = c.hearings.find(h => h.id === id);
                    if (found) {
                        targetCase = c;
                        targetHearing = found;
                        break;
                    }
                }
            }
            if (targetCase && targetHearing) {
                const now = new Date().toISOString();
                const normalizedStatus = updates.status ? updates.status.toLowerCase() : targetHearing.status;
                const updatedHearing = { 
                    ...targetHearing, 
                    ...updates,
                    status: normalizedStatus,
                    updatedAt: now,
                    completedAt: normalizedStatus === 'completed' ? (targetHearing.completedAt || now) : null
                };
                const updatedHearings = targetCase.hearings.map(h => h.id === id ? updatedHearing : h);
                await apiService.updateProject(targetCase._id, {
                    ...targetCase,
                    hearings: updatedHearings
                });
                this.notifyListeners();
                return true;
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error updating hearing", e);
            throw e;
        }
    },

    async deleteHearing(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.hearings) && c.hearings.some(h => h.id === id)) {
                    const updatedHearings = c.hearings.filter(h => h.id !== id);
                    await apiService.updateProject(c._id, {
                        ...c,
                        hearings: updatedHearings
                    });
                    this.notifyListeners();
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error deleting hearing", e);
            throw e;
        }
    },

    async syncHearingStatus(title, status) {
        if (!title) return false;
        try {
            const cases = await this.getCases();
            const targetCase = cases.find(c => c.name?.trim().toLowerCase() === title.trim().toLowerCase() || c.title?.trim().toLowerCase() === title.trim().toLowerCase());
            if (targetCase && Array.isArray(targetCase.hearings)) {
                const normalizedStatus = status.toLowerCase() === 'completed' ? 'completed' : 'scheduled';
                const now = new Date().toISOString();
                const updatedHearings = targetCase.hearings.map(h => {
                    return {
                        ...h,
                        status: normalizedStatus,
                        completedAt: normalizedStatus === 'completed' ? now : null,
                        updatedAt: now
                    };
                });
                await apiService.updateProject(targetCase._id, {
                    ...targetCase,
                    hearings: updatedHearings
                });
                this.notifyListeners();
                return true;
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error syncing hearing status", e);
            return false;
        }
    },

    // --- Reminders ---
    async getReminders() {
        try {
            const cases = await this.getCases();
            const reminders = [];
            cases.forEach(c => {
                if (Array.isArray(c.reminders)) {
                    reminders.push(...c.reminders);
                }
            });
            return reminders;
        } catch (e) {
            console.error("[LegalService] Error getting reminders", e);
            return [];
        }
    },

    async getRemindersForCase(caseId) {
        try {
            const cases = await this.getCases();
            const c = cases.find(item => item._id === caseId || item.id === caseId);
            return c ? (c.reminders || []) : [];
        } catch (e) {
            console.error("[LegalService] Error getting reminders for case", e);
            return [];
        }
    },

    async addReminder(reminder) {
        try {
            const cases = await this.getCases();
            const caseId = reminder.case_id || reminder.caseId;
            const target = cases.find(item => item._id === caseId || item.id === caseId) || cases[0];
            if (target) {
                const newReminder = { ...reminder, id: Date.now().toString(), createdAt: new Date().toISOString() };
                const existing = target.reminders || [];
                await apiService.updateProject(target._id, {
                    ...target,
                    reminders: [newReminder, ...existing]
                });
                return newReminder;
            }
            return null;
        } catch (e) {
            console.error("[LegalService] Error adding reminder", e);
            throw e;
        }
    },

    async updateReminder(id, updates) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.reminders) && c.reminders.some(r => r.id === id)) {
                    const updatedReminders = c.reminders.map(r => r.id === id ? { ...r, ...updates } : r);
                    await apiService.updateProject(c._id, {
                        ...c,
                        reminders: updatedReminders
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error updating reminder", e);
            throw e;
        }
    },

    async deleteReminder(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.reminders) && c.reminders.some(r => r.id === id)) {
                    const updatedReminders = c.reminders.filter(r => r.id !== id);
                    await apiService.updateProject(c._id, {
                        ...c,
                        reminders: updatedReminders
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error deleting reminder", e);
            throw e;
        }
    },

    // --- Compliance Center ---
    async getComplianceData() {
        try {
            const cases = await this.getCases();
            if (cases.length > 0) {
                return cases[0].compliance || { score: null, riskLevel: null, lastAudit: null, alerts: [], requirements: [] };
            }
            return { score: null, riskLevel: null, lastAudit: null, alerts: [], requirements: [] };
        } catch (e) {
            console.error("[LegalService] Error getting compliance data", e);
            return { score: null, riskLevel: null, lastAudit: null, alerts: [], requirements: [] };
        }
    },

    async updateComplianceScore(score) {
        try {
            const cases = await this.getCases();
            if (cases.length > 0) {
                const target = cases[0];
                const current = target.compliance || { score: null, riskLevel: null, lastAudit: null, alerts: [], requirements: [] };
                await apiService.updateProject(target._id, {
                    ...target,
                    compliance: { ...current, score }
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error updating compliance score", e);
            return false;
        }
    },

    // --- Activity Logs ---
    async getRecentActivity() {
        try {
            const cases = await this.getCases();
            const activity = [];
            cases.forEach(c => {
                if (Array.isArray(c.activityLog)) {
                    activity.push(...c.activityLog);
                }
            });
            activity.sort((a, b) => b.timestamp - a.timestamp);
            return activity.slice(0, 20);
        } catch (e) {
            console.error("[LegalService] Error getting activity", e);
            return [];
        }
    },

    async addActivity(title, type) {
        try {
            const cases = await this.getCases();
            if (cases.length > 0) {
                const target = cases[0];
                const now = new Date();
                const newItem = { 
                    id: Date.now().toString(), 
                    title, 
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                    timestamp: now.getTime(),
                    type 
                };
                const existing = target.activityLog || [];
                const updated = [newItem, ...existing].slice(0, 20);
                await apiService.updateProject(target._id, {
                    ...target,
                    activityLog: updated
                });
                return updated;
            }
            return [];
        } catch (e) {
            console.error("[LegalService] Error adding activity", e);
            return [];
        }
    },

    // --- Timeline Events ---
    async getTimelineEvents(caseId) {
        try {
            const cases = await this.getCases();
            if (caseId) {
                const c = cases.find(item => item._id === caseId || item.id === caseId);
                return c ? (c.timelineEvents || []) : [];
            }
            const allEvents = [];
            cases.forEach(c => {
                if (Array.isArray(c.timelineEvents)) {
                    allEvents.push(...c.timelineEvents);
                }
            });
            return allEvents;
        } catch (e) {
            console.error("[LegalService] Error getting timeline events", e);
            return [];
        }
    },

    async saveTimelineEvent(event) {
        try {
            const cases = await this.getCases();
            const caseId = event.caseId || event.case_id;
            const target = cases.find(item => item._id === caseId || item.id === caseId);
            if (target) {
                const now = new Date().toISOString();
                const normalizedStatus = event.status ? event.status.toLowerCase() : 'scheduled';
                const newEvent = {
                    ...event,
                    status: normalizedStatus,
                    id: event.id || Date.now().toString(),
                    timestamp: event.id ? (event.timestamp || now) : now,
                    updatedAt: now,
                    completedAt: normalizedStatus === 'completed' ? now : null
                };
                const existing = target.timelineEvents || [];
                const updated = event.id ? existing.map(e => e.id === event.id ? newEvent : e) : [newEvent, ...existing];
                await apiService.updateProject(target._id, {
                    ...target,
                    timelineEvents: updated
                });
                await this.addActivity(`Timeline Event: ${event.title}`, 'timeline');
                return newEvent;
            }
            return null;
        } catch (e) {
            console.error("[LegalService] Error saving timeline event", e);
            throw e;
        }
    },

    async deleteTimelineEvent(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.timelineEvents) && c.timelineEvents.some(e => e.id === id)) {
                    const updated = c.timelineEvents.filter(e => e.id !== id);
                    await apiService.updateProject(c._id, {
                        ...c,
                        timelineEvents: updated
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error deleting timeline event", e);
            throw e;
        }
    },

    // --- Hearing Documents ---
    async getHearingDocuments(hearingId) {
        try {
            const cases = await this.getCases();
            const docs = [];
            cases.forEach(c => {
                if (Array.isArray(c.documents)) {
                    c.documents.forEach(d => {
                        if (d.hearingId === hearingId) {
                            docs.push(d);
                        }
                    });
                }
            });
            return docs;
        } catch (e) {
            console.error("[LegalService] Error getting hearing documents", e);
            return [];
        }
    },

    async saveHearingDocument(doc) {
        try {
            const cases = await this.getCases();
            const target = cases.find(c => c.hearings && c.hearings.some(h => h.id === doc.hearingId)) || cases[0];
            if (target) {
                const newDoc = {
                    ...doc,
                    id: doc.id || Date.now().toString(),
                    uploadDate: new Date().toISOString()
                };
                const existing = target.documents || [];
                const updated = doc.id ? existing.map(d => d.id === doc.id ? newDoc : d) : [newDoc, ...existing];
                await apiService.updateProject(target._id, {
                    ...target,
                    documents: updated
                });
                await this.addActivity(`Document Uploaded: ${newDoc.name}`, 'document');
                return newDoc;
            }
            return null;
        } catch (e) {
            console.error("[LegalService] Error saving hearing document", e);
            throw e;
        }
    },

    async deleteHearingDocument(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.documents) && c.documents.some(d => d.id === id)) {
                    const updated = c.documents.filter(d => d.id !== id);
                    await apiService.updateProject(c._id, {
                        ...c,
                        documents: updated
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error deleting hearing document", e);
            throw e;
        }
    },

    // --- Hearing Reminders ---
    async getHearingReminder(hearingId) {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const token = user?.token;
                if (token) {
                    const response = await axios.get(`${API}/legal/reminders/${hearingId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data && response.data.success) {
                        return response.data.reminder;
                    }
                }
            }
        } catch (error) {
            console.log('[legalService] getHearingReminder API failed, falling back to case storage.', error?.response?.data || error.message);
        }

        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.hearingReminders)) {
                    const found = c.hearingReminders.find(r => r.hearingId === hearingId);
                    if (found) return found;
                }
            }
        } catch (e) {
            console.error("[LegalService] getHearingReminder case lookup failed", e);
        }
        return null;
    },

    async saveHearingReminder(reminder) {
        let savedReminder = null;
        let isOnlineSuccess = false;
        let authError = false;

        try {
            const userStr = localStorage.getItem('user');
            let token = null;
            if (userStr) {
                const user = JSON.parse(userStr);
                token = user?.token;
            }

            if (token) {
                const response = await axios.post(`${API}/legal/reminders`, reminder, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.success) {
                    savedReminder = response.data.reminder;
                    isOnlineSuccess = true;
                }
            } else {
                authError = true;
            }
        } catch (error) {
            console.log('[legalService] saveHearingReminder API failed.', error.message);
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                authError = true;
            }
        }

        if (!savedReminder) {
            savedReminder = {
                ...reminder,
                id: reminder.id || Date.now().toString(),
                userId: 'current_user_fallback'
            };
        }

        try {
            const cases = await this.getCases();
            const targetCase = cases.find(c => c.hearings && c.hearings.some(h => h.id === reminder.hearingId)) || cases[0];
            if (targetCase) {
                const existing = targetCase.hearingReminders || [];
                const updated = existing.filter(r => r.hearingId !== reminder.hearingId);
                updated.push(savedReminder);
                await apiService.updateProject(targetCase._id, {
                    ...targetCase,
                    hearingReminders: updated
                });
            }
        } catch (e) {
            console.error("[LegalService] Error syncing hearing reminder to project", e);
        }

        if (authError) {
            throw new Error('Authentication error. Saved to case database. Please log in again to sync.');
        }

        if (!isOnlineSuccess) {
            throw new Error('Network error. Saved to case database.');
        }

        return savedReminder;
    },

    async deleteHearingReminder(hearingId) {
        let isOnlineSuccess = false;
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const token = user?.token;
                if (token) {
                    const response = await axios.delete(`${API}/legal/reminders/${hearingId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data && response.data.success) {
                        isOnlineSuccess = true;
                    }
                }
            }
        } catch (error) {
            console.log('[legalService] deleteHearingReminder API failed, falling back to case storage.', error?.response?.data || error.message);
        }

        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.hearingReminders) && c.hearingReminders.some(r => r.hearingId === hearingId)) {
                    const updated = c.hearingReminders.filter(r => r.hearingId !== hearingId);
                    await apiService.updateProject(c._id, {
                        ...c,
                        hearingReminders: updated
                    });
                }
            }
        } catch (e) {
            console.error("[LegalService] Error deleting hearing reminder", e);
        }

        if (!isOnlineSuccess) {
            throw new Error('Network error. Deleted from case database.');
        }

        return true;
    },

    // --- Notifications ---
    async getNotifications() {
        try {
            const cases = await this.getCases();
            const notifications = [];
            cases.forEach(c => {
                if (Array.isArray(c.notifications)) {
                    notifications.push(...c.notifications);
                }
            });
            return notifications;
        } catch (e) {
            console.error("[LegalService] Error getting notifications", e);
            return [];
        }
    },

    async saveNotification(notif) {
        try {
            const cases = await this.getCases();
            const caseId = notif.caseId || notif.case_id;
            const target = cases.find(c => c._id === caseId || c.id === caseId) || cases[0];
            if (target) {
                const newNotif = {
                    ...notif,
                    id: Date.now().toString(),
                    isRead: false,
                    createdAt: new Date().toISOString()
                };
                const existing = target.notifications || [];
                await apiService.updateProject(target._id, {
                    ...target,
                    notifications: [newNotif, ...existing]
                });
                return newNotif;
            }
            return null;
        } catch (e) {
            console.error("[LegalService] Error saving notification", e);
            throw e;
        }
    },

    async markNotificationAsRead(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.notifications) && c.notifications.some(n => n.id === id)) {
                    const updated = c.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
                    await apiService.updateProject(c._id, {
                        ...c,
                        notifications: updated
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error marking notification as read", e);
            throw e;
        }
    },

    async markAllNotificationsAsRead() {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.notifications) && c.notifications.length > 0) {
                    const updated = c.notifications.map(n => ({ ...n, isRead: true }));
                    await apiService.updateProject(c._id, {
                        ...c,
                        notifications: updated
                    });
                }
            }
            return true;
        } catch (e) {
            console.error("[LegalService] Error marking all notifications as read", e);
            return false;
        }
    },

    // --- Evidence Analysis History ---
    async getEvidenceHistory() {
        try {
            const cases = await this.getCases();
            const history = [];
            cases.forEach(c => {
                if (Array.isArray(c.forensicHistory)) {
                    history.push(...c.forensicHistory);
                }
            });
            return history;
        } catch (e) {
            console.error("[LegalService] Error getting evidence history", e);
            return [];
        }
    },

    async saveEvidenceSession(session) {
        try {
            const cases = await this.getCases();
            const caseId = session.caseId || session.case_id;
            const target = cases.find(c => c._id === caseId || c.id === caseId) || cases[0];
            if (target) {
                const newSession = { 
                    ...session, 
                    id: Date.now().toString(), 
                    timestamp: new Date().toISOString(),
                    displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    displayDate: new Date().toLocaleDateString()
                };
                const existing = target.forensicHistory || [];
                await apiService.updateProject(target._id, {
                    ...target,
                    forensicHistory: [newSession, ...existing]
                });
                await this.addActivity(`Evidence Analyzed: ${session.fileName || 'Document'}`, 'evidence');
                return newSession;
            }
            return null;
        } catch (e) {
            console.error("[LegalService] Error saving evidence session", e);
            throw e;
        }
    },

    async deleteEvidenceSession(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (Array.isArray(c.forensicHistory) && c.forensicHistory.some(s => s.id === id)) {
                    const updated = c.forensicHistory.filter(s => s.id !== id);
                    await apiService.updateProject(c._id, {
                        ...c,
                        forensicHistory: updated
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error deleting evidence session", e);
            throw e;
        }
    },

    // --- Argument Builder History ---
    async getArgumentHistory() {
        try {
            const cases = await this.getCases();
            const history = [];
            cases.forEach(c => {
                if (c.argumentsData && Array.isArray(c.argumentsData.sessions)) {
                    c.argumentsData.sessions.forEach(s => {
                        history.push({
                            ...s,
                            caseId: c._id || c.id,
                            title: s.title || 'Untitled Argument'
                        });
                    });
                }
            });
            return history;
        } catch (e) {
            console.error("[LegalService] Error getting argument history", e);
            return [];
        }
    },

    async saveArgumentSession(session) {
        try {
            const cases = await this.getCases();
            const caseId = session.caseId || session.case_id;
            const target = cases.find(c => c._id === caseId || c.id === caseId) || cases[0];
            if (target) {
                const newSession = { 
                    ...session, 
                    id: Date.now().toString(), 
                    timestamp: new Date().toISOString(),
                    displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    displayDate: new Date().toLocaleDateString()
                };
                const currentData = target.argumentsData || { sessions: [], activeSessionId: '' };
                const updatedSessions = [newSession, ...currentData.sessions];
                await apiService.updateProject(target._id, {
                    ...target,
                    argumentsData: {
                        sessions: updatedSessions,
                        activeSessionId: currentData.activeSessionId || newSession.id
                    }
                });
                await this.addActivity(`Argument Built: ${session.title}`, 'argument');
                return newSession;
            }
            return null;
        } catch (e) {
            console.error("[LegalService] Error saving argument session", e);
            throw e;
        }
    },

    async deleteArgumentSession(id) {
        try {
            const cases = await this.getCases();
            for (const c of cases) {
                if (c.argumentsData && Array.isArray(c.argumentsData.sessions) && c.argumentsData.sessions.some(s => s.id === id)) {
                    const updatedSessions = c.argumentsData.sessions.filter(s => s.id !== id);
                    await apiService.updateProject(c._id, {
                        ...c,
                        argumentsData: {
                            ...c.argumentsData,
                            sessions: updatedSessions
                        }
                    });
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error deleting argument session", e);
            throw e;
        }
    },

    // --- Chat History ---
    async getChatHistory(toolId) {
        try {
            const cases = await this.getCases();
            if (cases.length > 0) {
                const c = cases[0];
                const chats = c.toolChats || {};
                return chats[toolId] || [];
            }
            return [];
        } catch (e) {
            console.error("[LegalService] Error getting chat history", e);
            return [];
        }
    },

    async saveChatMessage(toolId, message) {
        try {
            const cases = await this.getCases();
            if (cases.length > 0) {
                const target = cases[0];
                const chats = target.toolChats || {};
                if (!chats[toolId]) chats[toolId] = [];
                chats[toolId].push({ ...message, id: Date.now().toString(), timestamp: new Date().toISOString() });
                await apiService.updateProject(target._id, {
                    ...target,
                    toolChats: chats
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error saving chat message", e);
            return false;
        }
    },

    async clearChatHistory(toolId) {
        try {
            const cases = await this.getCases();
            if (cases.length > 0) {
                const target = cases[0];
                const chats = target.toolChats || {};
                chats[toolId] = [];
                await apiService.updateProject(target._id, {
                    ...target,
                    toolChats: chats
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error("[LegalService] Error clearing chat history", e);
            return false;
        }
    },

    // --- Stats & Analytics ---
    async getDashboardStats() {
        try {
            const cases = await this.getCases();
            const hearings = await this.getHearings();
            
            let totalScore = 0;
            let complianceCount = 0;
            let riskLevel = null;
            let evidenceCount = 0;
            let argumentsCount = 0;

            cases.forEach(c => {
                if (c.compliance && c.compliance.score !== null && c.compliance.score !== undefined) {
                    totalScore += c.compliance.score;
                    complianceCount++;
                    riskLevel = c.compliance.riskLevel || riskLevel;
                }
                if (Array.isArray(c.forensicHistory)) {
                    evidenceCount += c.forensicHistory.length;
                }
                if (c.argumentsData && Array.isArray(c.argumentsData.sessions)) {
                    argumentsCount += c.argumentsData.sessions.length;
                }
            });

            const activeCases = cases.filter(c => c.status === 'Active').length;
            const upcomingHearings = hearings.filter(h => h.status?.toLowerCase() !== 'completed' && h.status?.toLowerCase() !== 'adjourned').length;
            const totalInsights = evidenceCount + argumentsCount;

            const hasAnyData = cases.length > 0 || hearings.length > 0 || complianceCount > 0;
            if (!hasAnyData) return null;

            const averageScore = complianceCount > 0 ? Math.round(totalScore / complianceCount) : null;

            return {
                activeCases: activeCases.toString(),
                hearingsCount: upcomingHearings.toString(),
                complianceScore: averageScore !== null ? `${averageScore}%` : null,
                riskScore: riskLevel || null,
                aiInsights: totalInsights > 0 ? totalInsights.toString() : null,
            };
        } catch (e) {
            console.error("[LegalService] Error getting dashboard stats", e);
            return null;
        }
    }
};
