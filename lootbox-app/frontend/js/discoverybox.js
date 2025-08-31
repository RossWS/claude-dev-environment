// DiscoveryBox game logic
class DiscoveryBoxGame {
    constructor() {
        this.currentType = null;
        this.selectedContent = null;
        this.isOpening = false;
        this.initializeElements();
        this.attachEventListeners();
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
        const collectibleCard = document.getElementById('resultCollectibleCard');
        const unlockBanner = document.getElementById('unlockStatusBanner');
        
        // Clear previous rarity classes and add new one
        collectibleCard.className = 'collectible-card unlock-animation';
        collectibleCard.classList.add(content.rarity.tier);
        collectibleCard.setAttribute('data-type', this.currentType);

        // Update unlock status banner
        if (unlockBanner) {
            if (unlock.wasNewUnlock) {
                unlockBanner.textContent = '🎉 NEW UNLOCK!';
                unlockBanner.className = 'unlock-status-banner new-unlock';
            } else {
                unlockBanner.textContent = '📚 Already Owned';
                unlockBanner.className = 'unlock-status-banner duplicate';
            }
        }

        // Update collectible card elements
        document.getElementById('collectibleCardTitle').textContent = content.title;
        document.getElementById('collectibleCardCost').textContent = content.qualityScore;
        
        // Set content type and icon
        const cardType = document.getElementById('collectibleCardType');
        const cardIcon = document.getElementById('collectibleCardIcon');
        const contentEmoji = content.emoji || (this.currentType === 'series' ? '📺' : '🎬');
        
        if (this.currentType === 'series') {
            cardType.textContent = '📺 Series';
            cardIcon.textContent = contentEmoji;
        } else {
            cardType.textContent = '🎬 Movie';
            cardIcon.textContent = contentEmoji;
        }

        // Set rarity gem
        document.getElementById('collectibleRarityGem').textContent = content.rarity.icon;

        // Update stats
        document.getElementById('collectibleQualityScore').textContent = content.qualityScore;
        document.getElementById('collectibleCriticsScore').textContent = content.critics_score + '%';
        document.getElementById('collectibleAudienceScore').textContent = content.audience_score + '%';
        
        // Update duration label and value based on content type
        const durationLabel = document.getElementById('collectibleDurationLabel');
        const durationValue = document.getElementById('collectibleDuration');
        if (this.currentType === 'series') {
            durationLabel.textContent = 'Seasons';
            durationValue.textContent = content.seasons || 'N/A';
        } else {
            durationLabel.textContent = 'Runtime';
            durationValue.textContent = content.duration;
        }

        // Update description and footer
        document.getElementById('collectibleDescription').textContent = content.description;
        const cardYear = document.getElementById('collectibleCardYear');
        if (this.currentType === 'series' && content.end_year && content.end_year !== content.year) {
            cardYear.textContent = `${content.year}-${content.end_year}`;
        } else {
            cardYear.textContent = content.year;
        }
        document.getElementById('collectibleCardRarity').textContent = content.rarity.label;

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
                isFirstTime: unlock.is_new
            }
        });
        document.dispatchEvent(unlockEvent);
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
        
        if (spinsCount) {
            spinsCount.textContent = spins.remaining;
        }

        // Hide spin status if no spins remaining
        if (spinStatus && spins.remaining <= 0) {
            spinStatus.style.opacity = '0.5';
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
            const response = await api.lootbox.getStatus();
            if (response.success) {
                this.updateSpinStatus(response.spins);
            }
        } catch (error) {
            console.warn('Failed to load spin status:', error);
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

    // Top up spins (testing only)
    async topUpSpins() {
        try {
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
}

// Export for global use
window.DiscoveryBoxGame = DiscoveryBoxGame;