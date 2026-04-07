/**
 * ═══════════════════════════════════════════
 * 🔗 PlastiPay — In-Memory Session Store
 * Links a user to a machine for bottle deposits
 * ═══════════════════════════════════════════
 */

// Map<machineId, { userId, userFirstName, userLastName, userPoints, startedAt }>
const activeSessions = new Map();

const SessionStore = {
    /**
     * Start a session: link a user to a machine
     */
    start(machineId, userId, firstName, lastName, totalPoints) {
        // End any existing session on this machine
        this.endByMachine(machineId);
        // End any existing session for this user on another machine
        this.endByUser(userId);

        const session = {
            machineId,
            userId,
            userFirstName: firstName,
            userLastName: lastName,
            userPoints: totalPoints,
            bottlesThisSession: 0,
            pointsThisSession: 0,
            startedAt: new Date(),
        };
        activeSessions.set(machineId, session);
        console.log(`🔗 Session started: ${firstName} ${lastName} → Machine #${machineId}`);
        return session;
    },

    /**
     * Get active session for a machine (ESP32 polls this)
     */
    getByMachine(machineId) {
        return activeSessions.get(machineId) || null;
    },

    /**
     * Get active session for a user
     */
    getByUser(userId) {
        for (const [machineId, session] of activeSessions) {
            if (session.userId === userId) {
                return { ...session, machineId };
            }
        }
        return null;
    },

    /**
     * Update points in the session (after bottle deposit)
     */
    updatePoints(machineId, newTotalPoints, pointsEarned) {
        const session = activeSessions.get(machineId);
        if (session) {
            session.userPoints = newTotalPoints;
            session.bottlesThisSession += 1;
            session.pointsThisSession += pointsEarned;
        }
        return session;
    },

    /**
     * End session by machine ID
     */
    endByMachine(machineId) {
        const session = activeSessions.get(machineId);
        if (session) {
            console.log(`🔓 Session ended: ${session.userFirstName} ${session.userLastName} — Machine #${machineId} (${session.bottlesThisSession} bottles, +${session.pointsThisSession} pts)`);
            activeSessions.delete(machineId);
        }
        return session;
    },

    /**
     * End session by user ID
     */
    endByUser(userId) {
        for (const [machineId, session] of activeSessions) {
            if (session.userId === userId) {
                activeSessions.delete(machineId);
                console.log(`🔓 Session ended by user: ${session.userFirstName} — Machine #${machineId}`);
                return session;
            }
        }
        return null;
    },

    /**
     * List all active sessions (for debugging)
     */
    listAll() {
        return Array.from(activeSessions.entries()).map(([machineId, s]) => ({
            machineId,
            ...s,
        }));
    },
};

module.exports = SessionStore;
