document.addEventListener('DOMContentLoaded', function () {
    const tagButton = document.getElementById('tagPost');
    const stanceRadios = document.getElementsByName('stance');

    tagButton.addEventListener('click', async () => {
        const selectedStance = Array.from(stanceRadios).find(radio => radio.checked)?.value;

        if (!selectedStance) {
            alert('Please select a stance first!');
            return;
        }

        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, {
            action: 'tagPost',
            stance: selectedStance
        }, (response) => {
            if (response && response.success) {
                alert('Post tagged successfully!');
            } else {
                alert('Failed to tag post. Make sure you are on a Facebook post page.');
            }
        });
    });
}); 