# Facebook Stance Tag Chrome Extension

A Chrome extension that allows users to tag Facebook posts with their stance (Support, Oppose, or Neutral).

## Installation

1. Clone this repository or download the files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension should now be installed and visible in your Chrome toolbar

## Usage

1. Navigate to any Facebook post
2. Click the extension icon in your Chrome toolbar
3. Select your stance (Support, Oppose, or Neutral)
4. Click "Tag Current Post"
5. The post will be tagged with your selected stance

## Features

- Simple and intuitive interface
- Color-coded stance tags
- Works on any Facebook post
- No data collection or storage

## Development

To modify the extension:
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. The changes will be applied immediately

## File Structure

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- `content.js` - Content script for Facebook interaction
- `styles.css` - Styling for the popup
- `images/` - Directory containing extension icons
