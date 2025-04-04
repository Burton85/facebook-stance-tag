// Function to extract cft parameter from href
function extractCftParameter(href) {
    try {
        const url = new URL(href);
        const cftParam = url.searchParams.get('__cft__[0]');
        return cftParam || null;
    } catch (error) {
        console.log('Error extracting cft parameter:', error);
        return null;
    }
}

// Function to create stance popup
function createStancePopup() {
    const popup = document.createElement('div');
    popup.className = 'fb-stance-popup';
    popup.innerHTML = `
    <div class="fb-stance-popup-title">選擇立場</div>
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

// Function to add stance tag to post
function addStanceTag(post, stance, cftParam) {
    const existingTag = post.querySelector('.fb-stance-tag');
    if (existingTag) {
        existingTag.remove();
    }

    const tag = document.createElement('div');
    tag.className = 'fb-stance-tag';
    tag.style.backgroundColor = getStanceColor(stance);
    tag.textContent = getStanceText(stance);
    tag.setAttribute('data-cft', cftParam);

    // Make sure post has position relative for absolute positioning
    if (window.getComputedStyle(post).position === 'static') {
        post.style.position = 'relative';
    }
    post.appendChild(tag);

    // Store the stance in Chrome storage
    chrome.storage.local.set({
        [cftParam]: {
            stance: stance,
            timestamp: Date.now()
        }
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

// Main function to handle post detection and popup creation
function handlePosts() {
    console.log('Scanning for Facebook posts...');

    // Find all links with __cft__ parameter
    const links = document.querySelectorAll('a[href*="__cft__"]');
    console.log('Found links:', links.length);

    // Process each link
    links.forEach(link => {
        // Find the closest article container
        const post = link;
        if (!post) return;

        const cftParam = extractCftParameter(link.href);
        if (!cftParam) return;

        console.log('Found post with cft:', cftParam);

        // Skip if already processed
        if (post.hasAttribute('data-stance-processed')) {
            return;
        }

        // Mark as processed and store cft parameter
        post.setAttribute('data-stance-processed', 'true');
        post.setAttribute('data-cft', cftParam);

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
        chrome.storage.local.get(cftParam, (result) => {
            if (result[cftParam]) {
                addStanceTag(post, result[cftParam].stance, cftParam);
            }
        });

        // Handle button click
        addButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove any existing popups
            const existingPopup = document.querySelector('.fb-stance-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            // Create and position new popup
            const popup = createStancePopup();
            document.body.appendChild(popup);
            positionPopup(popup, post);

            // Handle stance selection
            popup.addEventListener('click', (e) => {
                if (e.target.classList.contains('fb-stance-button')) {
                    const stance = e.target.dataset.stance;
                    addStanceTag(post, stance, cftParam);
                    popup.remove();
                }
            });

            // Close popup when clicking outside
            document.addEventListener('click', function closePopup(e) {
                if (!popup.contains(e.target) && e.target !== addButton) {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                }
            });
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