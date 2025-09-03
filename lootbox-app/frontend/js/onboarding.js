// Onboarding Flow Management
class OnboardingManager {
    constructor() {
        this.elements = {
            tryFirstSpinBtn: document.getElementById('tryFirstSpinBtn'),
            contentTypeSelection: document.getElementById('contentTypeSelection'),
            qualityEducationModal: document.getElementById('qualityEducationModal'),
            educationCloseBtn: document.getElementById('educationCloseBtn'),
            educationGotItBtn: document.getElementById('educationGotItBtn'),
            achievementNotification: document.getElementById('achievementNotification'),
            guestProgressBanner: document.getElementById('guestProgressBanner'),
            signUpFromProgress: document.getElementById('signUpFromProgress'),
            dismissProgress: document.getElementById('dismissProgress'),
            progressSpinCount: document.getElementById('progressSpinCount')
        };

        this.initializeEventListeners();
        this.checkOnboardingState();
    }

    initializeEventListeners() {
        // Try First Spin button
        if (this.elements.tryFirstSpinBtn) {
            this.elements.tryFirstSpinBtn.addEventListener('click', () => {
                this.handleFirstSpinClick();
            });
        }

        // Education modal controls
        if (this.elements.educationCloseBtn) {
            this.elements.educationCloseBtn.addEventListener('click', () => {
                this.closeEducationModal();
            });
        }

        if (this.elements.educationGotItBtn) {
            this.elements.educationGotItBtn.addEventListener('click', () => {
                this.closeEducationModal();
                this.proceedToNextSpin();
            });
        }

        // Progress banner controls
        if (this.elements.signUpFromProgress) {
            this.elements.signUpFromProgress.addEventListener('click', () => {
                this.handleSignUpFromProgress();
            });
        }

        if (this.elements.dismissProgress) {
            this.elements.dismissProgress.addEventListener('click', () => {
                this.dismissProgressBanner();
            });
        }

        // Listen for auth state changes
        document.addEventListener('authStateChanged', (event) => {
            if (event.detail.isAuthenticated) {
                this.handleUserRegistration();
            }
        });

        // Listen for content unlocks
        document.addEventListener('contentUnlocked', (event) => {
            this.handleContentUnlock(event.detail);
        });

        // Close modals on outside click
        if (this.elements.qualityEducationModal) {
            this.elements.qualityEducationModal.addEventListener('click', (event) => {
                if (event.target === this.elements.qualityEducationModal) {
                    this.closeEducationModal();
                }
            });
        }
    }

    checkOnboardingState() {
        // Check if user is authenticated
        if (Utils.storage.get('authToken')) {
            return; // Skip onboarding for authenticated users
        }

        // Check guest session state
        if (guestSession && guestSession.isGuestSession()) {
            const stats = guestSession.getStats();
            
            // Show education modal if needed
            if (guestSession.shouldShowEducation()) {
                setTimeout(() => this.showEducationModal(), 2000);
            }

            // Show progress banner if needed
            if (guestSession.shouldShowRegistrationPrompt()) {
                this.showProgressBanner(stats.totalSpins);
            }

            // Update UI based on guest progress
            this.updateUIForGuestProgress(stats);
        }
    }

    handleFirstSpinClick() {
        // Smoothly transition to content selection
        const heroSection = document.querySelector('.hero-section');
        const contentSelection = this.elements.contentTypeSelection;

        if (heroSection && contentSelection) {
            // Add transition styles
            heroSection.style.transition = 'all 0.5s ease-out';
            contentSelection.style.transition = 'all 0.5s ease-out';
            contentSelection.style.opacity = '0';
            contentSelection.style.transform = 'translateY(20px)';

            // Hide hero section with animation
            heroSection.style.opacity = '0';
            heroSection.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                // Hide hero section completely
                heroSection.style.display = 'none';
                
                // Show content selection
                contentSelection.classList.remove('hidden');
                
                // Animate content selection in
                setTimeout(() => {
                    contentSelection.style.opacity = '1';
                    contentSelection.style.transform = 'translateY(0)';
                }, 50);
                
                // Scroll to content selection smoothly
                contentSelection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }

        // Mark onboarding step
        if (guestSession) {
            guestSession.markStepCompleted('landing');
        }
    }

    handleContentUnlock(unlockDetail) {
        const { content, unlock } = unlockDetail;
        
        // Record the unlock in guest session
        if (guestSession) {
            guestSession.recordSpin(content);
        }

        // Check if we should show education
        if (guestSession && guestSession.shouldShowEducation()) {
            setTimeout(() => this.showEducationModal(), 1500);
        }

        // Check if we should show registration prompt
        setTimeout(() => {
            if (guestSession && guestSession.shouldShowRegistrationPrompt()) {
                const stats = guestSession.getStats();
                this.showProgressBanner(stats.totalSpins);
            }
        }, 3000);

        // Show achievement notification if there are new achievements
        if (guestSession) {
            const session = guestSession.getSession();
            const newAchievements = session.achievements.filter(a => 
                Date.now() - a.unlockedAt < 5000 // Unlocked in last 5 seconds
            );
            
            newAchievements.forEach((achievement, index) => {
                setTimeout(() => this.showAchievement(achievement), index * 2000);
            });
        }
    }

    showEducationModal() {
        if (this.elements.qualityEducationModal) {
            this.elements.qualityEducationModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    closeEducationModal() {
        if (this.elements.qualityEducationModal) {
            this.elements.qualityEducationModal.classList.add('hidden');
            document.body.style.overflow = '';
        }

        // Mark education as shown
        if (guestSession) {
            guestSession.markEducationShown();
        }
    }

    proceedToNextSpin() {
        // Encourage another spin
        UI.showNotification('Great! Try another spin to build your collection 🎬', 'success', 4000);
        
        // Return to discovery box if user wants to spin again
        if (window.discoveryBox) {
            setTimeout(() => {
                // Show discovery box screen if not already visible
                const discoveryboxScreen = document.getElementById('discoveryboxScreen');
                const resultScreen = document.getElementById('resultScreen');
                
                if (discoveryboxScreen && resultScreen && !resultScreen.classList.contains('hidden')) {
                    // User is on result screen, show "Discover Another" button prominently
                    const discoverAnotherBtn = document.querySelector('.result-actions .btn-primary');
                    if (discoverAnotherBtn) {
                        discoverAnotherBtn.style.animation = 'pulse 2s infinite';
                        setTimeout(() => {
                            discoverAnotherBtn.style.animation = '';
                        }, 4000);
                    }
                }
            }, 500);
        }
    }

    showAchievement(achievement) {
        if (!this.elements.achievementNotification) return;

        const iconElement = document.getElementById('achievementIcon');
        const titleElement = document.getElementById('achievementTitle');
        const descElement = document.getElementById('achievementDescription');

        if (iconElement) iconElement.textContent = achievement.icon;
        if (titleElement) titleElement.textContent = achievement.title;
        if (descElement) descElement.textContent = achievement.description;

        this.elements.achievementNotification.classList.remove('hidden');
        this.elements.achievementNotification.classList.add('visible');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.elements.achievementNotification.classList.remove('visible');
            setTimeout(() => {
                this.elements.achievementNotification.classList.add('hidden');
            }, 300);
        }, 5000);
    }

    showProgressBanner(spinCount) {
        if (!this.elements.guestProgressBanner) return;

        // Update spin count
        if (this.elements.progressSpinCount) {
            this.elements.progressSpinCount.textContent = spinCount;
        }

        // Show banner
        this.elements.guestProgressBanner.classList.add('visible');

        // Mark that we've prompted for registration
        if (guestSession) {
            guestSession.markRegistrationPrompted();
        }
    }

    dismissProgressBanner() {
        if (this.elements.guestProgressBanner) {
            this.elements.guestProgressBanner.classList.remove('visible');
        }

        // Show again later if user continues spinning
        setTimeout(() => {
            if (guestSession && guestSession.shouldShowRegistrationPrompt()) {
                const stats = guestSession.getStats();
                if (stats.totalSpins >= 6) { // Show again after 6+ spins
                    this.showProgressBanner(stats.totalSpins);
                }
            }
        }, 120000); // Wait 2 minutes
    }

    handleSignUpFromProgress() {
        // Navigate to registration with pre-filled incentive
        const guestData = guestSession ? guestSession.exportSessionData() : null;
        
        // Store guest data for account migration
        if (guestData) {
            sessionStorage.setItem('guestMigrationData', JSON.stringify(guestData));
        }

        // Show registration form with bonus message
        this.showRegistrationWithBonus();
    }

    showRegistrationWithBonus() {
        // Navigate to auth screen
        if (window.authManager) {
            authManager.showRegisterForm();
        }

        // Show bonus notification
        UI.showNotification('🎁 Sign up now and get 1 bonus spin to keep exploring!', 'success', 6000);

        // Add special styling to registration form
        setTimeout(() => {
            const registerScreen = document.getElementById('registerScreen');
            if (registerScreen && !registerScreen.classList.contains('hidden')) {
                registerScreen.classList.add('bonus-signup');
                
                // Add bonus message to form
                const authCard = registerScreen.querySelector('.auth-card');
                if (authCard && !authCard.querySelector('.bonus-message')) {
                    const bonusMessage = document.createElement('div');
                    bonusMessage.className = 'bonus-message';
                    bonusMessage.innerHTML = `
                        <div class="bonus-icon">🎁</div>
                        <div class="bonus-text">
                            <strong>Limited Time Offer!</strong>
                            <span>Save your progress + get 1 bonus spin</span>
                        </div>
                    `;
                    authCard.insertBefore(bonusMessage, authCard.firstChild);
                }
            }
        }, 100);
    }

    handleUserRegistration() {
        // User has successfully registered/logged in
        this.migrateGuestData();
        this.hideOnboardingElements();
        this.showWelcomeMessage();
        
        // Navigate to fresh game state (selection screen)
        setTimeout(() => {
            if (window.router) {
                // Reset any existing game state
                if (window.discoveryboxGame) {
                    window.discoveryboxGame.resetGame();
                }
                // Navigate to game route
                window.router.navigate('/game');
            }
        }, 1500); // Allow time for welcome message
    }

    migrateGuestData() {
        const guestDataStr = sessionStorage.getItem('guestMigrationData');
        if (!guestDataStr) return;

        try {
            const guestData = JSON.parse(guestDataStr);
            
            // Send guest data to server for migration
            // This would be handled by the backend to merge guest progress
            console.log('Migrating guest data:', guestData);
            
            // Clear guest data
            sessionStorage.removeItem('guestMigrationData');
            if (guestSession) {
                guestSession.clearSession();
            }
            
        } catch (error) {
            console.error('Failed to migrate guest data:', error);
        }
    }

    hideOnboardingElements() {
        // Hide guest-specific UI elements
        if (this.elements.guestProgressBanner) {
            this.elements.guestProgressBanner.classList.remove('visible');
        }
        
        // Remove any bonus styling
        const registerScreen = document.getElementById('registerScreen');
        if (registerScreen) {
            registerScreen.classList.remove('bonus-signup');
        }
    }

    showWelcomeMessage() {
        // Check if user was a guest who had spins to get bonus
        const wasGuest = guestSession && guestSession.isGuestSession();
        
        UI.showNotification('🎉 Welcome to DiscoveryBox! Your progress has been saved.', 'success', 5000);
        
        // Show bonus spin message if they were a guest
        if (wasGuest) {
            setTimeout(() => {
                UI.showNotification('🎁 Bonus! You received 1 extra spin for signing up!', 'success', 4000);
            }, 1500);
        }
        
        // Show trophy cabinet if they have unlocks
        setTimeout(() => {
            UI.showNotification('Check out your Trophy Cabinet to see your discoveries! 🏆', 'info', 4000);
        }, wasGuest ? 3000 : 2000);
    }

    updateUIForGuestProgress(stats) {
        // Update navigation to show guest stats
        const navUsername = document.getElementById('navUsername');
        if (navUsername && stats.totalSpins > 0) {
            navUsername.textContent = `Guest (${stats.totalSpins} spins)`;
            navUsername.style.opacity = '0.8';
        }

        // Add guest trophy cabinet access
        const trophyBtn = document.getElementById('trophyBtn');
        if (trophyBtn && stats.totalUnlocks > 0) {
            trophyBtn.style.display = 'inline-flex';
            trophyBtn.title = `View your ${stats.totalUnlocks} discoveries`;
        }
    }

    // Public methods for external use
    triggerEducationModal() {
        this.showEducationModal();
    }

    triggerRegistrationPrompt() {
        const stats = guestSession ? guestSession.getStats() : { totalSpins: 3 };
        this.showProgressBanner(stats.totalSpins);
    }

    getGuestStats() {
        return guestSession ? guestSession.getStats() : null;
    }
}

// Create global instance
const onboardingManager = new OnboardingManager();