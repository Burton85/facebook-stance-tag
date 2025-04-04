// Function to create stance popup
function createStancePopup(stats) {
    const popup = document.createElement('div');
    popup.className = 'fb-stance-popup';

    // Create stats display HTML
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

// Function to position popup next to a post
function positionPopup(popup, post) {
    const rect = post.getBoundingClientRect();
    popup.style.top = `${window.scrollY + rect.top}px`;
    popup.style.left = `${rect.right + 10}px`;
}

// Function to update stance statistics
function updateStanceStats(postId, stance, oldStance = null) {
    console.log(`Updating stance for post "${postId}":`, {
        newStance: stance,
        oldStance: oldStance || 'none'
    });

    chrome.storage.local.get('stanceStats', (result) => {
        const stats = result.stanceStats || {};
        const postStats = stats[postId] || {
            left: 0,
            right: 0,
            neutral: 0,
            antiwar: 0,
            total: 0
        };

        console.log('Previous stats for post:', postStats);

        // If there was a previous stance, decrease its count
        if (oldStance) {
            postStats[oldStance] = Math.max(0, (postStats[oldStance] || 0) - 1);
            postStats.total = Math.max(0, postStats.total - 1);
            console.log(`Decreased count for ${oldStance} stance`);
        }

        // Increment the new stance count
        postStats[stance] = (postStats[stance] || 0) + 1;
        postStats.total = (postStats.total || 0) + 1;
        console.log(`Increased count for ${stance} stance`);

        // Update stats in storage
        stats[postId] = postStats;
        chrome.storage.local.set({ stanceStats: stats }, () => {
            console.log('Updated stance stats for post:', {
                postId: postId,
                newStats: postStats,
                totalPosts: Object.keys(stats).length
            });
        });
    });
}

// Function to get stance statistics for a post
function getStanceStats(postId) {
    return new Promise((resolve) => {
        chrome.storage.local.get('stanceStats', (result) => {
            const stats = result.stanceStats || {};
            resolve(stats[postId] || null);
        });
    });
}

// Function to show stance selection popup
async function showStancePopup(post, postId, existingTag = null) {
    // Remove any existing popups
    const existingPopup = document.querySelector('.fb-stance-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Hide existing tag temporarily
    if (existingTag) {
        existingTag.style.display = 'none';
    }

    // Get stance statistics before creating popup
    const stats = await getStanceStats(postId);

    // Create and position new popup
    const popup = createStancePopup(stats);
    document.body.appendChild(popup);
    positionPopup(popup, post);

    // Handle stance selection
    popup.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.target.classList.contains('fb-stance-button')) {
            const stance = e.target.dataset.stance;
            if (existingTag) {
                existingTag.remove();
            }
            addStanceTag(post, stance, postId);
            popup.remove();
        }
    });

    // Close popup when clicking outside
    document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && e.target !== existingTag) {
            popup.remove();
            if (existingTag && existingTag.style.display === 'none') {
                existingTag.style.display = '';
            }
            document.removeEventListener('click', closePopup);
        }
    }, true);

    // Prevent popup from triggering underlying elements
    popup.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    popup.addEventListener('mouseup', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
}

// Function to add stance tag to post
async function addStanceTag(post, stance, postId) {
    console.log(`Adding/Updating stance tag for post "${postId}"`);

    const existingTag = post.querySelector('.fb-stance-tag');
    const oldStance = existingTag ? existingTag.getAttribute('data-stance') : null;

    console.log('Stance change:', {
        postId: postId,
        from: oldStance || 'none',
        to: stance
    });

    if (existingTag) {
        console.log('Removing existing tag:', {
            oldStance: oldStance,
            element: existingTag
        });
        existingTag.remove();
    }

    const tag = document.createElement('div');
    tag.className = 'fb-stance-tag';
    tag.style.backgroundColor = getStanceColor(stance);
    tag.textContent = getStanceText(stance);
    tag.setAttribute('data-post-id', postId);
    tag.setAttribute('data-stance', stance);

    // Add click handler for re-selection
    tag.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Stance tag clicked for re-selection:', {
            postId: postId,
            currentStance: stance
        });
        showStancePopup(post, postId, tag);
    });

    // Prevent event propagation
    tag.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    tag.addEventListener('mouseup', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    // Make sure post has position relative for absolute positioning
    if (window.getComputedStyle(post).position === 'static') {
        post.style.position = 'relative';
    }
    post.appendChild(tag);
    console.log('New stance tag added:', {
        postId: postId,
        stance: stance,
        element: tag
    });

    // Update stance statistics
    updateStanceStats(postId, stance, oldStance);

    // Store the stance in Chrome storage
    chrome.storage.local.set({
        [postId]: {
            stance: stance,
            timestamp: Date.now()
        }
    }, () => {
        console.log('Stance stored in Chrome storage:', {
            postId: postId,
            stance: stance,
            timestamp: Date.now()
        });
    });
}

function getStanceColor(stance) {
    const colors = {
        left: '#FF6B6B',    // Coral Red
        right: '#4ECDC4',   // Turquoise
        neutral: '#95A5A6',  // Gray
        antiwar: '#9B59B6'   // Purple
    };
    return colors[stance] || '#95A5A6';
}

function getStanceText(stance) {
    const texts = {
        left: '左派',
        right: '右派',
        neutral: '中立',
        antiwar: '反戰'
    };
    return texts[stance] || stance;
}

// Function to handle posts
function handlePosts() {
    console.log('Scanning for Facebook posts...');

    // Find all links with aria-label and attributionsrc, but without target="_self"
    const links = document.querySelectorAll('a[aria-label][attributionsrc^="/privacy_sandbox/comet/register/source/"]:not([target="_self"])');
    console.log('Found links:', links.length);

    // Process each link
    links.forEach(link => {
        // Get the aria-label value as post identifier
        const postId = link.getAttribute('aria-label');
        if (!postId) return;

        // Log all relevant attributes for debugging
        console.log('Link attributes:', {
            postId: postId,
            attributionSrc: link.getAttribute('attributionsrc'),
            target: link.getAttribute('target'),
            hasTargetSelf: link.getAttribute('target') === '_self'
        });

        // Find the closest article container
        const post = link;
        if (!post) return;

        console.log('Found post with id:', postId);

        // Skip if already processed
        if (post.hasAttribute('data-stance-processed')) {
            return;
        }

        // Mark as processed and store post id and attribution source
        post.setAttribute('data-stance-processed', 'true');
        post.setAttribute('data-post-id', postId);
        post.setAttribute('data-attribution-src', link.getAttribute('attributionsrc'));

        // Make sure post has position relative for absolute positioning
        if (window.getComputedStyle(post).position === 'static') {
            post.style.position = 'relative';
        }

        // Create "T" button
        const addButton = document.createElement('button');
        addButton.textContent = 'T';
        addButton.className = 'fb-stance-add-button';

        // Add button to post
        post.appendChild(addButton);

        // Check if there's a stored stance for this post
        chrome.storage.local.get(postId, (result) => {
            if (result[postId]) {
                addStanceTag(post, result[postId].stance, postId);
            }
        });

        // Handle button click
        addButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const existingTag = post.querySelector('.fb-stance-tag');
            showStancePopup(post, postId, existingTag);
        });
    });
}

// Initial posts check
handlePosts();

// Watch for new posts being added (Facebook's infinite scroll)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            handlePosts();
        }
    });
});

// Start observing the document for added nodes
observer.observe(document.body, {
    childList: true,
    subtree: true
}); 