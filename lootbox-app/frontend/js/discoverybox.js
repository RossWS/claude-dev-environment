// DiscoveryBox game logic
class DiscoveryBoxGame {
    constructor() {
        this.currentType = null;
        this.selectedContent = null;
        this.isOpening = false;
        this.countdownInterval = null;
        this.initializeElements();
        this.attachEventListeners();
        this.initializeCountdownTimer();
    }

    initializeElements() {
        this.selectionScreen = document.getElementById('selectionScreen');
        this.discoveryboxScreen = document.getElementById('discoveryboxScreen');
        this.resultScreen = document.getElementById('resultScreen');
        this.movieChoice = document.getElementById('movieChoice');
        this.seriesChoice = document.getElementById('seriesChoice');
        this.discoverybox = document.getElementById('discoverybox');
    }

    attachEventListeners() {
        if (this.movieChoice) {
            this.movieChoice.addEventListener('click', () => this.openLootbox('movie'));
        }
        if (this.seriesChoice) {
            this.seriesChoice.addEventListener('click', () => this.openLootbox('series'));
        }

        const discoverBtn = document.getElementById('discoverAnotherBtn');
        if (discoverBtn) {
            discoverBtn.addEventListener('click', () => this.resetGame());
        }

        const topUpBtn = document.getElementById('topUpSpinsBtn');
        if (topUpBtn) {
            topUpBtn.addEventListener('click', () => this.topUpSpins());
        }
    }

    async openLootbox(type) {
        if (this.isOpening) return;
        
        // Check if guest has spins remaining
        const isGuest = !Utils.storage.get('authToken');
        if (isGuest && guestSession && !guestSession.hasSpinsRemaining()) {
            this.showNoSpinsRemaining();
            return;
        }
        
        this.isOpening = true;
        this.currentType = type;

        try {
            // Show discoverybox animation screen
            this.showDiscoveryBoxScreen();

            // Make API call to open discoverybox
            const response = await api.lootbox.open(type);

            if (response.success) {
                this.selectedContent = response.content;
                
                // Apply rarity glow to discoverybox
                this.applyRarityGlow(response.content.rarity.tier);

                // Wait for animation
                setTimeout(() => {
                    this.showResult(response);
                }, 3000);
            } else {
                UI.showNotification(response.message || 'Failed to open discoverybox', 'error');
                this.resetGame();
            }

        } catch (error) {
            console.error('Lootbox open error:', error);
            UI.showNotification(error.message || 'Failed to open discoverybox', 'error');
            this.resetGame();
        } finally {
            this.isOpening = false;
        }
    }

    showDiscoveryBoxScreen() {
        this.selectionScreen.classList.add('hidden');
        this.discoveryboxScreen.classList.remove('hidden');
        this.resultScreen.classList.add('hidden');
    }

    applyRarityGlow(tier) {
        if (!this.discoverybox) return;

        // Remove existing glow classes
        this.discoverybox.className = this.discoverybox.className.replace(/rarity-glow-\w+/g, '');
        
        // Add new glow class
        this.discoverybox.classList.add(`rarity-glow-${tier}`);
        
        // Apply glow to all faces
        const faces = this.discoverybox.querySelectorAll('.discoverybox-face');
        faces.forEach(face => {
            face.className = face.className.replace(/rarity-glow-\w+/g, '');
            face.classList.add(`rarity-glow-${tier}`);
        });
    }

    showResult(response) {
        const { content, unlock, spins } = response;

        // Hide discoverybox screen and show result
        this.discoveryboxScreen.classList.add('hidden');
        this.resultScreen.classList.remove('hidden');

        this.populateResultCard(content, unlock);
        this.createBurstEffect(content.rarity.tier);
        
        // Adjust card description to fit content
        setTimeout(() => {
            if (UI && UI.adjustCardDescriptions) {
                UI.adjustCardDescriptions();
            }
        }, 100);
        
        // Update spin status
        this.updateSpinStatus(spins);

        // Show special particles for high rarity items
        if (content.rarity.tier === 'mythic') {
            this.createMythicEffects();
        } else if (content.rarity.tier === 'legendary') {
            this.createLegendaryParticles();
        }
    }

    populateResultCard(content, unlock) {
        try {
            const collectibleCard = document.getElementById('resultCollectibleCard');
            const unlockBanner = document.getElementById('unlockStatusBanner');
            
            // Clear previous rarity classes and add new one
            collectibleCard.className = 'collectible-card unlock-animation';
            if (content.rarity && content.rarity.tier) {
                collectibleCard.classList.add(content.rarity.tier);
            }
            collectibleCard.setAttribute('data-type', this.currentType);

            // Update unlock status banner
            if (unlockBanner) {
                // Handle both authenticated (wasNewUnlock) and guest (is_new) formats
                const isNewUnlock = unlock.wasNewUnlock || unlock.is_new;
                if (isNewUnlock) {
                    unlockBanner.textContent = '🎉 NEW UNLOCK!';
                    unlockBanner.className = 'unlock-status-banner new-unlock';
                } else {
                    unlockBanner.textContent = '📚 Already Owned';
                    unlockBanner.className = 'unlock-status-banner duplicate';
                }
            }

            // Update collectible card elements with fallbacks
            const cardTitle = document.getElementById('collectibleCardTitle');
            const cardCost = document.getElementById('collectibleCardCost');
            
            if (cardTitle) cardTitle.textContent = content.title || 'Unknown Title';
            if (cardCost) cardCost.textContent = content.qualityScore || content.quality_score || '0';
        
            // Set content type and icon
            const cardType = document.getElementById('collectibleCardType');
            const cardIcon = document.getElementById('collectibleCardIcon');
            const contentEmoji = content.emoji || (this.currentType === 'series' ? '📺' : '🎬');
            
            if (cardType) {
                if (this.currentType === 'series') {
                    cardType.textContent = '📺 Series';
                } else {
                    cardType.textContent = '🎬 Movie';
                }
            }
            if (cardIcon) {
                cardIcon.textContent = contentEmoji;
            }

            // Set rarity gem with error handling
            const rarityGem = document.getElementById('collectibleRarityGem');
            if (rarityGem && content.rarity && content.rarity.icon) {
                rarityGem.textContent = content.rarity.icon;
            }

            // Update stats with error handling
            const qualityScoreEl = document.getElementById('collectibleQualityScore');
            const criticsScoreEl = document.getElementById('collectibleCriticsScore');
            const audienceScoreEl = document.getElementById('collectibleAudienceScore');
            
            if (qualityScoreEl) {
                qualityScoreEl.textContent = content.qualityScore || content.quality_score || '0';
            }
            if (criticsScoreEl) {
                const criticsScore = content.critics_score || 0;
                criticsScoreEl.textContent = criticsScore + '%';
            }
            if (audienceScoreEl) {
                const audienceScore = content.audience_score || 0;
                audienceScoreEl.textContent = audienceScore + '%';
            }
        
            // Update duration label and value based on content type
            const durationLabel = document.getElementById('collectibleDurationLabel');
            const durationValue = document.getElementById('collectibleDuration');
            if (durationLabel && durationValue) {
                if (this.currentType === 'series') {
                    durationLabel.textContent = 'Seasons';
                    durationValue.textContent = content.seasons || 'N/A';
                } else {
                    durationLabel.textContent = 'Runtime';
                    durationValue.textContent = content.duration || 'N/A';
                }
            }

            // Update description and footer with error handling
            const descriptionEl = document.getElementById('collectibleDescription');
            const cardYearEl = document.getElementById('collectibleCardYear');
            const rarityLabelEl = document.getElementById('collectibleCardRarity');
            
            if (descriptionEl) {
                descriptionEl.textContent = content.description || 'No description available';
            }
            
            if (cardYearEl) {
                if (this.currentType === 'series' && content.end_year && content.end_year !== content.year) {
                    cardYearEl.textContent = `${content.year}-${content.end_year}`;
                } else {
                    cardYearEl.textContent = content.year || 'Unknown';
                }
            }
            
            if (rarityLabelEl && content.rarity && content.rarity.label) {
                rarityLabelEl.textContent = content.rarity.label;
            }

            // Trigger unlock animation
            setTimeout(() => {
                collectibleCard.classList.add('unlock-animation');
            }, 100);

            // Add tutorial prompt for first-time users
            this.addCardTutorialPrompt();

            // Dispatch content unlock event for onboarding
            const unlockEvent = new CustomEvent('contentUnlocked', {
                detail: {
                    content: content,
                    unlock: unlock,
                    isFirstTime: unlock.is_new || unlock.wasNewUnlock
                }
            });
            document.dispatchEvent(unlockEvent);
            
        } catch (error) {
            console.error('Error populating result card:', error);
            // Don't throw the error to prevent global error handlers
        }
    }

    createBurstEffect(tier) {
        const burstContainer = document.getElementById('burstContainer');
        if (!burstContainer) return;

        const burst = document.createElement('div');
        burst.className = 'burst-effect';
        burstContainer.appendChild(burst);

        const color = Utils.getRarityColor(tier);

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'burst-particle';
            particle.style.background = color;
            particle.style.boxShadow = `0 0 6px ${color}`;
            
            const angle = (Math.PI * 2 * i) / 30;
            const distance = 200 + Math.random() * 100;
            particle.style.setProperty('--x', Math.cos(angle) * distance + 'px');
            particle.style.setProperty('--y', Math.sin(angle) * distance + 'px');
            
            burst.appendChild(particle);
        }

        setTimeout(() => {
            burstContainer.removeChild(burst);
        }, 1000);
    }

    addCardTutorialPrompt() {
        // Only show for guests who haven't seen education yet
        const isGuest = !Utils.storage.get('authToken');
        if (!isGuest) return;

        // Check if it's their first few unlocks
        const session = guestSession?.getSession();
        if (!session || session.totalSpins > 3) return;

        // Don't show if prompt already exists
        if (document.querySelector('.card-tutorial-prompt')) return;

        setTimeout(() => {
            const collectibleCard = document.getElementById('resultCollectibleCard');
            if (!collectibleCard) return;

            // Create tutorial prompt
            const prompt = document.createElement('div');
            prompt.className = 'card-tutorial-prompt';
            prompt.innerHTML = 'Learn How!';
            
            // Position relative to card
            collectibleCard.style.position = 'relative';
            collectibleCard.appendChild(prompt);

            // Add click handler
            prompt.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCardTutorial();
            });

            // Remove prompt after 15 seconds
            setTimeout(() => {
                if (prompt.parentNode) {
                    prompt.remove();
                }
            }, 15000);
        }, 2000); // Show after 2 seconds to let user see the card first
    }

    showCardTutorial() {
        // Trigger quality education modal
        if (window.onboardingManager) {
            onboardingManager.triggerEducationModal();
        }
    }

    createLegendaryParticles() {
        const container = document.getElementById('legendaryParticles');
        if (!container) return;

        container.classList.remove('hidden');
        container.innerHTML = '';

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'legendary-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(particle);
        }

        setTimeout(() => {
            container.classList.add('hidden');
        }, 8000);
    }

    createMythicEffects() {
        // Transform entire site background to mythic theme
        this.transformBackgroundToMythic();
        
        // Create enhanced mythic particles
        const container = document.getElementById('legendaryParticles');
        if (!container) return;

        container.classList.remove('hidden');
        container.innerHTML = '';

        // Create larger, more intense mythic particles
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'mythic-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 3 + 's';
            particle.style.animationDuration = (6 + Math.random() * 4) + 's';
            container.appendChild(particle);
        }

        // Keep mythic effects longer
        setTimeout(() => {
            container.classList.add('hidden');
            this.restoreNormalBackground();
        }, 12000);
    }

    transformBackgroundToMythic() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        // Transform existing particles to mythic colors
        const particles = particlesContainer.querySelectorAll('.particle');
        particles.forEach(particle => {
            particle.style.background = 'radial-gradient(circle, rgba(255, 0, 255, 0.9) 0%, rgba(255, 0, 255, 0) 70%)';
            particle.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.8)';
        });

        // Change body background gradient temporarily
        document.body.style.background = 'linear-gradient(135deg, #1a0f2e 0%, #2e1a3e 50%, #3e1642 100%)';
    }

    restoreNormalBackground() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        // Restore particles to normal colors
        const particles = particlesContainer.querySelectorAll('.particle');
        particles.forEach(particle => {
            particle.style.background = 'radial-gradient(circle, rgba(138, 43, 226, 0.8) 0%, rgba(138, 43, 226, 0) 70%)';
            particle.style.boxShadow = '';
        });

        // Restore normal background
        document.body.style.background = '';
    }

    updateSpinStatus(spins) {
        const spinsCount = document.getElementById('spinsCount');
        const spinStatus = document.getElementById('spinStatus');
        const refreshTimer = document.getElementById('spinRefreshTimer');
        
        if (spinsCount) {
            spinsCount.textContent = spins.remaining;
        }

        // Show/hide refresh timer based on spins remaining
        if (refreshTimer) {
            if (spins.remaining <= 0) {
                refreshTimer.style.display = 'block';
            } else {
                refreshTimer.style.display = 'none';
            }
        }

        // Hide spin status if no spins remaining
        if (spinStatus && spins.remaining <= 0) {
            spinStatus.style.opacity = '0.5';
        } else if (spinStatus) {
            spinStatus.style.opacity = '1';
        }
    }

    initializeCountdownTimer() {
        // Start the countdown timer immediately
        this.countdownInterval = Utils.countdown.start('countdownDisplay', (secondsLeft, formattedTime) => {
            // Optional callback for when countdown reaches zero or specific milestones
            if (secondsLeft === 0) {
                // Spins should refresh at midnight, we could trigger a check here
                this.checkForSpinRefresh();
            }
        });
    }

    async checkForSpinRefresh() {
        try {
            // Check if spins have been refreshed
            const isGuest = !Utils.storage.get('authToken');
            
            if (isGuest && guestSession) {
                const guestSpinStatus = guestSession.getSpinStatus();
                this.updateSpinStatus({ remaining: guestSpinStatus.remaining });
            } else if (!isGuest) {
                const response = await api.lootbox.getStatus();
                if (response.success) {
                    this.updateSpinStatus(response.spins);
                }
            }
        } catch (error) {
            console.warn('Failed to check for spin refresh:', error);
        }
    }

    resetGame() {
        try {
            this.currentType = null;
            this.selectedContent = null;
            this.isOpening = false;

            // Show selection screen
            this.selectionScreen.classList.remove('hidden');
            this.discoveryboxScreen.classList.add('hidden');
            this.resultScreen.classList.add('hidden');

            // Hide legendary particles
            const legendaryParticles = document.getElementById('legendaryParticles');
            if (legendaryParticles) {
                legendaryParticles.classList.add('hidden');
            }

            // Restore normal background (in case mythic effects are still active)
            this.restoreNormalBackground();
        } catch (error) {
            console.error('Error in resetGame:', error);
        }

        // Reset discoverybox glow
        if (this.discoverybox) {
            this.discoverybox.className = 'discoverybox';
            const faces = this.discoverybox.querySelectorAll('.discoverybox-face');
            faces.forEach(face => {
                face.className = 'discoverybox-face';
            });
        }

        // Refresh spin status
        this.loadSpinStatus();
    }

    async loadSpinStatus() {
        try {
            // For guests, get spin status from guest session
            const isGuest = !Utils.storage.get('authToken');
            if (isGuest && guestSession) {
                const guestSpinStatus = guestSession.getGuestSpinStatus();
                this.updateSpinStatus({ remaining: guestSpinStatus.remaining });
                return;
            }
            
            const response = await api.lootbox.getStatus();
            if (response.success) {
                this.updateSpinStatus(response.spins);
                
                // For authenticated users, skip the hero section and go straight to content selection
                this.initializeAuthenticatedUserView();
            }
        } catch (error) {
            console.warn('Failed to load spin status:', error);
        }
    }

    // Initialize view for authenticated users (skip onboarding)
    initializeAuthenticatedUserView() {
        const heroSection = document.querySelector('.hero-section');
        const contentSelection = document.getElementById('contentTypeSelection');
        
        if (heroSection && contentSelection) {
            // Hide hero section for authenticated users
            heroSection.style.display = 'none';
            
            // Show content selection directly
            contentSelection.classList.remove('hidden');
            contentSelection.style.opacity = '1';
            contentSelection.style.transform = 'translateY(0)';
            
            console.log('🎮 Game: Initialized for authenticated user - skipping onboarding');
        }
    }

    // Initialize particles in background
    createBackgroundParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            particlesContainer.appendChild(particle);
        }
    }

    showNoSpinsRemaining() {
        // Show sign-up prompt for guests who are out of spins
        UI.showNotification('You\'ve used all your guest spins! Sign up to get 1 bonus spin and save your progress 🎯', 'warning', 8000);
        
        // Trigger the registration prompt
        if (window.onboardingManager) {
            setTimeout(() => {
                onboardingManager.triggerRegistrationPrompt();
            }, 1000);
        }
    }

    // Top up spins (testing only)
    async topUpSpins() {
        try {
            // Check if user is a guest
            const isGuest = !Utils.storage.get('authToken');
            
            if (isGuest && guestSession) {
                // Add bonus spins for guests (testing purposes)
                guestSession.addBonusSpins(5);
                UI.showNotification('🎁 Added 5 bonus spins for testing!', 'success');
                // Refresh spin status
                await this.loadSpinStatus();
                return;
            }
            
            // Regular authenticated user flow
            const response = await api.user.topUpSpins();
            if (response.success) {
                UI.showNotification(response.message, 'success');
                // Refresh spin status
                await this.loadSpinStatus();
            } else {
                UI.showNotification(response.message || 'Failed to top up spins', 'error');
            }
        } catch (error) {
            console.error('Top up spins error:', error);
            UI.showNotification(error.message || 'Failed to top up spins', 'error');
        }
    }

    // Cleanup method to stop countdown timer
    cleanup() {
        if (this.countdownInterval) {
            Utils.countdown.stop(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}

// Export for global use
window.DiscoveryBoxGame = DiscoveryBoxGame;