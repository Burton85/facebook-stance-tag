// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tagPost') {
        try {
            // Find the main post content
            const post = document.querySelector('[role="article"]');

            if (!post) {
                sendResponse({ success: false, error: 'No post found' });
                return;
            }

            // Create and add the stance tag
            const tag = document.createElement('div');
            tag.className = 'stance-tag';
            tag.style.cssText = `
        background-color: ${getStanceColor(request.stance)};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        margin: 8px 0;
        display: inline-block;
        font-weight: bold;
      `;
            tag.textContent = `Stance: ${request.stance}`;

            // Insert the tag after the post content
            post.appendChild(tag);

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Required for async response
});

function getStanceColor(stance) {
    const colors = {
        support: '#4CAF50',
        oppose: '#F44336',
        neutral: '#9E9E9E'
    };
    return colors[stance] || '#9E9E9E';
} 