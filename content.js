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

        addButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const existingTag = this.element.querySelector('.fb-stance-tag');
            StanceSelector.showPopup(this.element, this.postId, existingTag);
        });
    }

    async loadExistingStance() {
        chrome.storage.local.get(this.postId, (result) => {
            if (result[this.postId]) {
                this.addStanceTag(result[this.postId].stance);
            }
        });
    }

    addStanceTag(stance) {
        const existingTag = this.element.querySelector('.fb-stance-tag');
        const oldStance = existingTag ? existingTag.getAttribute('data-stance') : null;

        if (existingTag) {
            existingTag.remove();
        }

        const tag = document.createElement('div');
        tag.className = 'fb-stance-tag';
        tag.style.backgroundColor = StanceSelector.getStanceColor(stance);
        tag.textContent = StanceSelector.getStanceText(stance);
        tag.setAttribute('data-post-id', this.postId);
        tag.setAttribute('data-stance', stance);

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
        StanceManager.updateStance(this.postId, stance, oldStance);
    }
}

// StanceManager class to handle stance storage and statistics
class StanceManager {
    static async getStats(postId) {
        return new Promise((resolve) => {
            chrome.storage.local.get('stanceStats', (result) => {
                const stats = result.stanceStats || {};
                resolve(stats[postId] || null);
            });
        });
    }

    static updateStance(postId, stance, oldStance = null) {
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
            chrome.storage.local.set({ stanceStats: stats });
        });

        chrome.storage.local.set({
            [postId]: {
                stance: stance,
                timestamp: Date.now()
            }
        });
    }
}

// StanceSelector class to handle UI for stance selection
class StanceSelector {
    static async showPopup(post, postId, existingTag = null) {
        const existingPopup = document.querySelector('.fb-stance-popup');
        if (existingPopup) existingPopup.remove();

        if (existingTag) {
            existingTag.style.display = 'none';
        }

        const stats = await StanceManager.getStats(postId);
        const popup = this.createPopup(stats);
        document.body.appendChild(popup);
        this.positionPopup(popup, post);

        this.setupPopupEventListeners(popup, post, postId, existingTag);
    }

    static createPopup(stats) {
        const popup = document.createElement('div');
        popup.className = 'fb-stance-popup';

        const statsHtml = stats ? `
            <div class="fb-stance-stats">
                <div class="stat-item left">${stats.left || 0} 左</div>
                <div class="stat-item right">${stats.right || 0} 右</div>
                <div class="stat-item neutral">${stats.neutral || 0} 中</div>
                <div class="stat-item antiwar">${stats.antiwar || 0} 反</div>
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
                postInstance.addStanceTag(stance);
                popup.remove();
            }
        });

        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== existingTag) {
                popup.remove();
                if (existingTag && existingTag.style.display === 'none') {
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