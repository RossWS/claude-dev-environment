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
        
        // Update spin status
        this.updateSpinStatus(spins);

        // Show legendary particles for legendary items
        if (content.rarity.tier === 'legendary' || content.rarity.tier === 'mythic') {
            this.createLegendaryParticles();
        }
    }

    populateResultCard(content, unlock) {
        const resultCard = document.getElementById('resultCard');
        
        // Clear previous rarity classes and add new one
        resultCard.className = 'result-card';
        resultCard.classList.add(content.rarity.tier);

        // Update content badge
        const contentBadge = document.getElementById('contentBadge');
        if (contentBadge) {
            contentBadge.textContent = this.currentType.toUpperCase();
            contentBadge.classList.add(this.currentType);
        }

        // Update rarity badge
        const rarityBadge = document.getElementById('rarityBadge');
        if (rarityBadge) {
            rarityBadge.innerHTML = `${content.rarity.icon} ${content.rarity.label}`;
            rarityBadge.className = 'rarity-badge';
            rarityBadge.classList.add(content.rarity.tier);
        }

        // Update unlock status
        const unlockStatus = document.getElementById('unlockStatus');
        if (unlockStatus) {
            if (unlock.wasNewUnlock) {
                unlockStatus.textContent = '🎉 NEW UNLOCK!';
                unlockStatus.className = 'unlock-status';
            } else {
                unlockStatus.textContent = '📚 Already Owned';
                unlockStatus.className = 'unlock-status duplicate';
            }
        }

        // Update content details
        document.getElementById('contentTitle').textContent = content.title;
        document.getElementById('contentRating').textContent = 
            `Critics: ${content.critics_score}% | Audience: ${content.audience_score}%`;
        
        const qualityScore = document.getElementById('qualityScore');
        qualityScore.innerHTML = `${content.rarity.icon} Score: ${content.qualityScore}`;
        qualityScore.className = 'quality-score';
        qualityScore.classList.add(content.rarity.tier);

        document.getElementById('contentYear').textContent = content.year;
        document.getElementById('contentDuration').textContent = content.duration;
        document.getElementById('releaseInfo').textContent = `${content.month} ${content.year}`;
        document.getElementById('contentDescription').textContent = content.description;
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