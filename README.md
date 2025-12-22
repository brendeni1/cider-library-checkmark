# Library Checkmark for Cider

A Cider plugin that shows minimal checkmark icons on album tracks that are in your Apple Music library.

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Cider](https://img.shields.io/badge/Cider-2.5%2B-red.svg)

## Features

- ✅ **Visual Indicators**: Shows a subtle checkmark on tracks that are in your library
- 🎯 **Album View Only**: Works exclusively on album pages (playlists excluded)
- ⚡ **Smart Caching**: Configurable cache durations for optimal performance
- 🔄 **Loading Icons**: Optional spinning indicators while checking library status
- ⚙️ **Customizable Settings**: Full control over cache durations and display options
- 💾 **Persistent Storage**: Caches library data in localStorage for fast subsequent loads

## Installation

### From Cider Marketplace (Coming Soon)
1. Open Cider
2. Go to Settings → Plugins → Marketplace
3. Search for "Library Checkmark"
4. Click Install

### Manual Installation
1. Download the latest release from [Releases](https://github.com/brendeni1/cider-library-checkmark/releases)
2. Extract the ZIP file
3. Copy the plugin folder to your Cider plugins directory:
   - **Windows**: `%APPDATA%\C2Windows\plugins`
   - **macOS**: `~/Library/Application Support/sh.cider.electron/plugins`
   - **Linux**: `~/.config/sh.cider.electron/plugins`
4. Restart Cider

### Build from Source
```bash
# Clone the repository
git clone https://github.com/brendeni1/cider-library-checkmark.git
cd cider-library-checkmark

# Install dependencies
pnpm install

# Build the plugin
pnpm run build

# The built plugin will be in dist/brendeni1.library-checkmark
```

## Settings

Access plugin settings via: **Cider Settings → Plugins → Library Checkmark → Settings Icon**

### Cache Settings
- **Library Cache Duration** (1-60 minutes, default: 5)
  - How long to cache your complete library list
  - Recommended: 5 minutes for optimal balance
  
- **Single Song Cache Duration** (1-30 minutes, default: 2)
  - How long to cache individual song library status checks
  - Recommended: 2 minutes to quickly reflect recent changes

### Display Settings
- **Enable Loading Icons** (toggle, default: enabled)
  - Shows a spinning icon while checking library status
  - Disable for a cleaner, minimal interface

### Actions
- **Refetch Library** - Manually refresh your library data and update all checkmarks
- **Clear Cache** - Clear all cached data (forces fresh fetch on next check)

## How It Works

1. **Initial Load**: When you view an album, the plugin fetches your complete library catalog
2. **Smart Caching**: Your library list is cached for 5 minutes (configurable)
3. **Track Checking**: Each track is checked against your cached library
4. **Visual Feedback**: Checkmarks appear on tracks in your library (if not favorited)
5. **Performance**: Individual song checks are cached for 2 minutes (configurable)

### Cache Strategy

The plugin uses a two-tier caching system:

- **Library Catalog Cache** (5 min default): Stores the complete list of your library songs
  - Saved to localStorage for persistence across sessions
  - Refreshes automatically after expiration
  
- **Individual Song Cache** (2 min default): Stores library status for specific tracks
  - In-memory only (cleared on page refresh)
  - Provides quick responses for recently checked songs

## Developer Commands

Access via browser console:

```javascript
// Manually refresh library and update all checkmarks
window.libraryCheckmarkPlugin.refreshLibraryCheckmarks()

// Clear all cached library data
window.libraryCheckmarkPlugin.clearLibraryCache()

// Legacy commands (still supported)
refreshLibraryCheckmarks()
clearLibraryCache()
```

## Technical Details

- **Requires**: Cider 2.5 or later
- **Library Size**: Supports up to 25,000 songs
- **API Rate Limiting**: Smart batching prevents API throttling
- **DOM Observer**: Automatically detects new tracks without manual refresh
- **No External Dependencies**: Pure TypeScript/Vue implementation

## Troubleshooting

### Checkmarks not appearing?
1. Ensure you're on an album view (not a playlist)
2. Try the **Refetch Library** button in settings
3. Check browser console for error messages
4. Verify you're signed into Apple Music

### Performance issues with large libraries?
1. Increase cache durations in settings
2. Disable loading icons if not needed
3. The initial fetch may take time for 10k+ song libraries

### Settings not saving?
1. Ensure browser localStorage is enabled
2. Try clearing cache and refetching
3. Restart Cider

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Development

```bash
# Start development server with hot reload
pnpm run dev

# Build for production
pnpm run build

# Prepare marketplace package
pnpm run prepare-marketplace
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

- Created by [brenden.i1](https://github.com/brendeni1)
- Built for [Cider](https://cider.sh)

## Support

- Report bugs: [GitHub Issues](https://github.com/brendeni1/cider-library-checkmark/issues)
- Feature requests: [GitHub Discussions](https://github.com/brendeni1/cider-library-checkmark/discussions)

---

**Note**: This plugin requires an active Apple Music subscription and only works within the Cider music player.
