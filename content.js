// StanceSelector class to handle UI for stance selection
class StanceSelector {
    static getHighestStance(stats) {
        if (!stats || stats.total === 0) return null;

        const stances = ['left', 'right', 'neutral', 'antiwar'];
        let highestStance = stances[0];
        let highestCount = stats[stances[0]] || 0;

        stances.forEach(stance => {
            const count = stats[stance] || 0;
            if (count > highestCount) {
                highestCount = count;
                highestStance = stance;
            }
        });

        return highestCount > 0 ? highestStance : null;
    }

    static getStanceColor(stance) {
        const colors = {
            left: '#FF6B6B',    // Coral Red
            right: '#4ECDC4',   // Turquoise
            neutral: '#95A5A6',  // Gray
            antiwar: '#9B59B6'   // Purple
        };
        return colors[stance] || '#95A5A6';
    }

    static getStanceText(stance) {
        const texts = {
            left: '左派',
            right: '右派',
            neutral: '中立',
            antiwar: '反戰'
        };
        return texts[stance] || stance;
    }

    static createPopup(stats) {
        const popup = document.createElement('div');
        popup.className = 'fb-stance-popup';

        // Calculate percentages if stats exist
        let percentages = { left: 0, right: 0, neutral: 0, antiwar: 0 };
        let highestStance = null;

        if (stats && stats.total > 0) {
            Object.keys(percentages).forEach(stance => {
                percentages[stance] = ((stats[stance] || 0) / stats.total * 100).toFixed(1);
            });
            highestStance = StanceSelector.getHighestStance(stats);
        }

        // Create stats display HTML with percentages and highlight highest
        const statsHtml = stats ? `
            <div class="fb-stance-stats">
                <div class="stat-item left${highestStance === 'left' ? ' highest' : ''}">${stats.left || 0} 左 (${percentages.left}%)</div>
                <div class="stat-item right${highestStance === 'right' ? ' highest' : ''}">${stats.right || 0} 右 (${percentages.right}%)</div>
                <div class="stat-item neutral${highestStance === 'neutral' ? ' highest' : ''}">${stats.neutral || 0} 中 (${percentages.neutral}%)</div>
                <div class="stat-item antiwar${highestStance === 'antiwar' ? ' highest' : ''}">${stats.antiwar || 0} 反 (${percentages.antiwar}%)</div>
            </div>
        ` : '';

        popup.innerHTML = `
            <div class="fb-stance-popup-title">選擇立場</div>
            ${statsHtml}
            <div class="fb-stance-options">
                <button class="fb-stance-button left" data-stance="left">左派</button>
                <button class="fb-stance-button right" data-stance="right">右派</button>
                <button class="fb-stance-button neutral" data-stance="neutral">中立</button>
                <button class="fb-stance-button antiwar" data-stance="antiwar">反戰</button>
            </div>
        `;
        return popup;
    }

    static async showPopup(post, postId, existingTag = null) {
        const existingPopup = document.querySelector('.fb-stance-popup');
        if (existingPopup) {
            existingPopup.remove();
            // Show the tag back if it exists when removing old popup
            if (existingTag) {
                existingTag.style.display = '';
            }
        }

        const stats = await StanceManager.getStats(postId);
        const popup = this.createPopup(stats);
        document.body.appendChild(popup);
        this.positionPopup(popup, post);

        popup.addEventListener('mouseleave', () => {
            const addButton = post.querySelector('.fb-stance-add-button');
            // Only remove popup and show tag if mouse isn't over the button
            if (!addButton?.matches(':hover')) {
                popup.remove();
                if (existingTag) {
                    existingTag.style.display = '';
                }
            }
        });

        this.setupPopupEventListeners(popup, post, postId, existingTag);
    }

    static positionPopup(popup, post) {
        const rect = post.getBoundingClientRect();
        popup.style.top = `${window.scrollY + rect.top}px`;
        popup.style.left = `${rect.right + 10}px`;
    }

    static setupPopupEventListeners(popup, post, postId, existingTag) {
        popup.addEventListener('click', (e) => {
            if (e.target.classList.contains('fb-stance-button')) {
                e.preventDefault();
                e.stopPropagation();
                const stance = e.target.dataset.stance;
                if (existingTag) {
                    existingTag.remove();
                }
                const postInstance = new Post(post, postId);
                postInstance.addStanceTag(stance, true);
                popup.remove();
            }
        });

        // Handle clicking outside popup
        document.addEventListener('click', function closePopup(e) {
            const addButton = post.querySelector('.fb-stance-add-button');
            if (!popup.contains(e.target) && !addButton.contains(e.target)) {
                popup.remove();
                if (existingTag) {
                    existingTag.style.display = '';
                }
                document.removeEventListener('click', closePopup);
            }
        }, true);

        ['mousedown', 'mouseup'].forEach(event => {
            popup.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }
}

// StanceManager class to handle stance storage and statistics
class StanceManager {
    static async getStats(postId) {
        return new Promise((resolve) => {
            chrome.storage.local.get('stanceStats', (result) => {
                const stats = result.stanceStats || {};
                const postStats = stats[postId] || {
                    left: 0,
                    right: 0,
                    neutral: 0,
                    antiwar: 0,
                    total: 0
                };
                resolve(postStats);
            });
        });
    }

    static async updateStance(postId, stance, oldStance = null) {
        return new Promise((resolve) => {
            chrome.storage.local.get('stanceStats', (result) => {
                const stats = result.stanceStats || {};
                const postStats = stats[postId] || {
                    left: 0, right: 0, neutral: 0, antiwar: 0, total: 0
                };

                if (oldStance) {
                    postStats[oldStance] = Math.max(0, (postStats[oldStance] || 0) - 1);
                    postStats.total = Math.max(0, postStats.total - 1);
                }

                postStats[stance] = (postStats[stance] || 0) + 1;
                postStats.total = (postStats.total || 0) + 1;

                stats[postId] = postStats;
                chrome.storage.local.set({ stanceStats: stats }, () => {
                    resolve(postStats);
                });
            });
        });
    }
}

// Post class to represent a Facebook post
class Post {
    constructor(element, postId) {
        this.element = element;
        this.postId = postId;
        this.init();
    }

    init() {
        if (this.element.hasAttribute('data-stance-processed')) return;

        this.element.setAttribute('data-stance-processed', 'true');
        this.element.setAttribute('data-post-id', this.postId);

        if (window.getComputedStyle(this.element).position === 'static') {
            this.element.style.position = 'relative';
        }

        this.addStanceButton();
        this.loadExistingStance();
    }

    addStanceButton() {
        const addButton = document.createElement('button');
        addButton.textContent = 'T';
        addButton.className = 'fb-stance-add-button';
        this.element.appendChild(addButton);

        let hoverTimeout;

        addButton.addEventListener('mouseenter', () => {
            const existingTag = this.element.querySelector('.fb-stance-tag');
            if (existingTag) {
                existingTag.style.display = 'none';
            }

            hoverTimeout = setTimeout(() => {
                StanceSelector.showPopup(this.element, this.postId, existingTag);
            }, 200);
        });

        addButton.addEventListener('mouseleave', () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }

            // Give time to move to popup before showing tag
            setTimeout(() => {
                const popup = document.querySelector('.fb-stance-popup');
                const existingTag = this.element.querySelector('.fb-stance-tag');
                if (!popup?.matches(':hover') && existingTag) {
                    existingTag.style.display = '';
                }
            }, 100);
        });

        addButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const existingTag = this.element.querySelector('.fb-stance-tag');
            StanceSelector.showPopup(this.element, this.postId, existingTag);
        });
    }

    async loadExistingStance() {
        const stats = await StanceManager.getStats(this.postId);
        if (stats && stats.total > 0) {
            const highestStance = StanceSelector.getHighestStance(stats);
            if (highestStance) {
                this.updateStanceTag(highestStance, stats);
            }
        }
    }

    async addStanceTag(stance, isUserSelection = false) {
        const existingTag = this.element.querySelector('.fb-stance-tag');
        const oldStance = existingTag ? existingTag.getAttribute('data-user-stance') : null;

        // Update stance statistics and get updated stats
        const updatedStats = await StanceManager.updateStance(this.postId, stance, oldStance);

        // If this is a user selection, store it
        if (isUserSelection) {
            chrome.storage.local.set({
                [this.postId]: {
                    stance: stance,
                    timestamp: Date.now()
                }
            });
        }

        // Get the highest stance and update the tag
        const highestStance = StanceSelector.getHighestStance(updatedStats);
        this.updateStanceTag(highestStance, updatedStats, stance);
    }

    updateStanceTag(highestStance, stats, userStance = null) {
        const existingTag = this.element.querySelector('.fb-stance-tag');
        if (existingTag) {
            existingTag.remove();
        }

        const tag = document.createElement('div');
        tag.className = 'fb-stance-tag';
        tag.style.backgroundColor = StanceSelector.getStanceColor(highestStance);
        tag.textContent = StanceSelector.getStanceText(highestStance);
        tag.setAttribute('data-post-id', this.postId);
        tag.setAttribute('data-stance', highestStance);
        if (userStance) {
            tag.setAttribute('data-user-stance', userStance);
        }

        // Add hover event listeners
        let hoverTimeout;

        tag.addEventListener('mouseenter', () => {
            hoverTimeout = setTimeout(() => {
                StanceSelector.showPopup(this.element, this.postId, tag);
            }, 200);
        });

        tag.addEventListener('mouseleave', () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
        });

        tag.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            StanceSelector.showPopup(this.element, this.postId, tag);
        });

        ['mousedown', 'mouseup'].forEach(event => {
            tag.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        this.element.appendChild(tag);
    }
}

// PostHandler class to manage post detection and initialization
class PostHandler {
    constructor() {
        this.init();
    }

    init() {
        this.handlePosts();
        this.observeNewPosts();
    }

    handlePosts() {
        const links = document.querySelectorAll('a[aria-label][attributionsrc^="/privacy_sandbox/comet/register/source/"]:not([target="_self"])');

        links.forEach(link => {
            const postId = link.getAttribute('aria-label');
            if (!postId) return;

            const post = link;
            if (!post) return;

            new Post(post, postId);
        });
    }

    observeNewPosts() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.handlePosts();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the application
new PostHandler(); 