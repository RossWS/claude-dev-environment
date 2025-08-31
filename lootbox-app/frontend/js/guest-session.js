// Guest Session Management for Anonymous Users
class GuestSession {
    constructor() {
        this.storageKey = 'lootbox_guest_session';
        this.onboardingKey = 'lootbox_onboarding_state';
        this.initializeSession();
    }

    initializeSession() {
        // Initialize guest session if it doesn't exist
        if (!this.getSession()) {
            this.createSession();
        }
        
        // Initialize onboarding state if it doesn't exist
        if (!this.getOnboardingState()) {
            this.createOnboardingState();
        }
    }

    createSession() {
        const session = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            spinsUsed: 0,
            spinStreak: 0,
            lastSpinTime: null,
            unlockedContent: [],
            achievements: [],
            rarityStats: {
                mythic: 0,
                legendary: 0,
                epic: 0,
                rare: 0,
                uncommon: 0,
                common: 0
            },
            totalSpins: 0,
            highestQualityScore: 0,
            favoriteGenres: {},
            sessionProgress: {
                hasSpun: false,
                educationShown: false,
                trophyCabinetViewed: false,
                registrationPrompted: false
            }
        };
        
        this.saveSession(session);
        return session;
    }

    createOnboardingState() {
        const onboardingState = {
            currentStep: 'landing',
            completedSteps: [],
            firstTimeUser: true,
            showQualityEducation: true,
            showRegistrationPrompt: true,
            conversionAttempts: 0,
            lastPromptTime: null
        };
        
        this.saveOnboardingState(onboardingState);
        return onboardingState;
    }

    generateSessionId() {
        return 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    getSession() {
        try {
            const session = localStorage.getItem(this.storageKey);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Failed to get guest session:', error);
            return null;
        }
    }

    saveSession(session) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(session));
        } catch (error) {
            console.error('Failed to save guest session:', error);
        }
    }

    getOnboardingState() {
        try {
            const state = localStorage.getItem(this.onboardingKey);
            return state ? JSON.parse(state) : null;
        } catch (error) {
            console.error('Failed to get onboarding state:', error);
            return null;
        }
    }

    saveOnboardingState(state) {
        try {
            localStorage.setItem(this.onboardingKey, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save onboarding state:', error);
        }
    }

    // Spin tracking
    recordSpin(content) {
        const session = this.getSession();
        if (!session) return;

        session.spinsUsed++;
        session.totalSpins++;
        session.lastSpinTime = Date.now();
        
        // Update streak
        const timeSinceLastSpin = session.lastSpinTime - (session.previousSpinTime || session.startTime);
        if (timeSinceLastSpin < 300000) { // Within 5 minutes
            session.spinStreak++;
        } else {
            session.spinStreak = 1;
        }
        session.previousSpinTime = session.lastSpinTime;

        // Track content unlock
        if (content) {
            session.unlockedContent.push({
                ...content,
                unlockedAt: Date.now(),
                sessionSpin: session.totalSpins
            });

            // Update rarity stats
            const rarity = Utils.getRarityTier(content.quality_score).tier;
            session.rarityStats[rarity] = (session.rarityStats[rarity] || 0) + 1;

            // Track highest quality score
            if (content.quality_score > session.highestQualityScore) {
                session.highestQualityScore = content.quality_score;
            }

            // Track favorite genres (if available)
            if (content.genre) {
                session.favoriteGenres[content.genre] = (session.favoriteGenres[content.genre] || 0) + 1;
            }
        }

        // Update progress flags
        session.sessionProgress.hasSpun = true;

        this.saveSession(session);
        this.checkAchievements(session);
    }

    checkAchievements(session) {
        const achievements = [];

        // First spin achievement
        if (session.totalSpins === 1) {
            achievements.push({
                id: 'first_spin',
                title: 'First Discovery!',
                description: 'You discovered your first movie recommendation',
                icon: '🎬',
                unlockedAt: Date.now()
            });
        }

        // Spin streak achievements
        if (session.spinStreak === 3) {
            achievements.push({
                id: 'hot_streak',
                title: 'On Fire!',
                description: 'Discovered 3 movies in a row',
                icon: '🔥',
                unlockedAt: Date.now()
            });
        }

        // Quality score achievements
        if (session.highestQualityScore >= 9.0) {
            achievements.push({
                id: 'perfectionist',
                title: 'Perfectionist',
                description: 'Found a movie with 9.0+ quality score',
                icon: '💎',
                unlockedAt: Date.now()
            });
        }

        // Rarity achievements
        if (session.rarityStats.mythic > 0) {
            achievements.push({
                id: 'mythic_hunter',
                title: 'Mythic Hunter',
                description: 'Discovered a mythic-tier movie',
                icon: '🌟',
                unlockedAt: Date.now()
            });
        }

        // Add new achievements
        achievements.forEach(achievement => {
            if (!session.achievements.find(a => a.id === achievement.id)) {
                session.achievements.push(achievement);
            }
        });

        if (achievements.length > 0) {
            this.saveSession(session);
            // Trigger achievement notifications
            this.showAchievements(achievements);
        }
    }

    showAchievements(achievements) {
        // This will be connected to the UI notification system
        achievements.forEach(achievement => {
            console.log('🏆 Achievement unlocked:', achievement.title);
            // UI.showAchievementNotification(achievement);
        });
    }

    // Onboarding progression
    markStepCompleted(step) {
        const onboarding = this.getOnboardingState();
        if (!onboarding) return;

        if (!onboarding.completedSteps.includes(step)) {
            onboarding.completedSteps.push(step);
        }
        onboarding.currentStep = this.getNextStep(step);

        this.saveOnboardingState(onboarding);
    }

    getNextStep(currentStep) {
        const flowSteps = ['landing', 'first_spin', 'education', 'engagement', 'conversion'];
        const currentIndex = flowSteps.indexOf(currentStep);
        return flowSteps[currentIndex + 1] || 'completed';
    }

    shouldShowEducation() {
        const onboarding = this.getOnboardingState();
        const session = this.getSession();
        
        return onboarding?.showQualityEducation && 
               session?.totalSpins >= 1 && 
               !onboarding.completedSteps.includes('education');
    }

    shouldShowTrophyCabinet() {
        const session = this.getSession();
        return session?.totalSpins >= 2 && !session.sessionProgress.trophyCabinetViewed;
    }

    shouldShowRegistrationPrompt() {
        const onboarding = this.getOnboardingState();
        const session = this.getSession();
        
        return session?.totalSpins >= 3 && 
               onboarding?.showRegistrationPrompt && 
               onboarding.conversionAttempts < 3;
    }

    markEducationShown() {
        const session = this.getSession();
        if (session) {
            session.sessionProgress.educationShown = true;
            this.saveSession(session);
        }
        
        this.markStepCompleted('education');
    }

    markTrophyCabinetViewed() {
        const session = this.getSession();
        if (session) {
            session.sessionProgress.trophyCabinetViewed = true;
            this.saveSession(session);
        }
    }

    markRegistrationPrompted() {
        const onboarding = this.getOnboardingState();
        if (onboarding) {
            onboarding.conversionAttempts++;
            onboarding.lastPromptTime = Date.now();
            this.saveOnboardingState(onboarding);
        }

        const session = this.getSession();
        if (session) {
            session.sessionProgress.registrationPrompted = true;
            this.saveSession(session);
        }
    }

    // Data export for account creation
    exportSessionData() {
        const session = this.getSession();
        if (!session) return null;

        return {
            guestSessionId: session.sessionId,
            unlockedContent: session.unlockedContent,
            achievements: session.achievements,
            rarityStats: session.rarityStats,
            sessionStats: {
                totalSpins: session.totalSpins,
                spinStreak: session.spinStreak,
                highestQualityScore: session.highestQualityScore,
                sessionDuration: Date.now() - session.startTime,
                favoriteGenres: session.favoriteGenres
            }
        };
    }

    // Clear guest data after successful registration
    clearSession() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.onboardingKey);
    }

    // Get session statistics for display
    getStats() {
        const session = this.getSession();
        if (!session) return null;

        const totalUnlocks = session.unlockedContent.length;
        const uniqueRarities = Object.values(session.rarityStats).filter(count => count > 0).length;
        
        return {
            totalSpins: session.totalSpins,
            totalUnlocks,
            spinStreak: session.spinStreak,
            uniqueRarities,
            highestQualityScore: session.highestQualityScore,
            achievements: session.achievements.length,
            sessionTime: this.getFormattedSessionTime(),
            favoriteGenre: this.getFavoriteGenre()
        };
    }

    getFormattedSessionTime() {
        const session = this.getSession();
        if (!session) return '0m';

        const duration = Date.now() - session.startTime;
        const minutes = Math.floor(duration / 60000);
        return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }

    getFavoriteGenre() {
        const session = this.getSession();
        if (!session || !session.favoriteGenres) return 'Unknown';

        const genres = Object.entries(session.favoriteGenres);
        if (genres.length === 0) return 'Exploring';

        return genres.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Check if user is a guest
    isGuestSession() {
        return !Utils.storage.get('authToken') && this.getSession();
    }
}

// Create global instance
const guestSession = new GuestSession();