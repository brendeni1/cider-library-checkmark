# Cider Library Checkmark Plugin

A minimal Cider plugin that shows a checkmark icon next to songs in album view that are in your Apple Music library. The checkmark appears in place of the favorite star for non-favorited songs, providing a clean visual indicator of library membership.

## Features

- **Minimal Design**: Shows a bold white checkmark icon for songs in your library
- **Smart Positioning**: Checkmark appears where the favorite star would be (only for non-favorited songs)
- **Album View Only**: Only appears on album view pages to avoid clutter on playlists
- **Efficient Caching**: Two-tier cache system for optimal performance
- **Batch Processing**: Checks entire albums in a single pass
- **Automatic Updates**: Refreshes library status periodically

## How the Checkmark Works

- **Song in library + NOT favorited** → Checkmark shows ✓
- **Song in library + favorited** → Star shows ★ (no checkmark)
- **Song NOT in library** → Empty space (no icon)

This ensures a clean, uncluttered look while providing maximum information.

## Installation

### From Release (Recommended)

1. Download the latest release from the [Releases page](https://github.com/brendeni1/cider-library-checkmark/releases)
2. Extract the `brendeni1.library-checkmark` folder from the ZIP
3. Open Cider and go to Settings → Extensions → Plugins
4. Click "..." and select "Open AppData Folder"
5. Navigate to the `plugins` directory
6. Copy the `brendeni1.library-checkmark` folder into the `plugins` directory
7. Back in Cider, click "..." again and select "Refresh Plugins List"
8. Enable the plugin

### From Source

```bash
# Clone the repository
git clone https://github.com/brendeni1/cider-library-checkmark.git
cd cider-library-checkmark

# Install dependencies
pnpm install

# Build the plugin
pnpm build

# The built plugin will be in the dist/ folder
# Copy the entire dist/ folder to your Cider plugins directory
```

## How It Works

The plugin uses a smart two-tier caching system:

### Cache Strategy

1. **Library Catalog Cache** (5 minutes)
   - Fetches your complete library once
   - Stores all catalog IDs in memory and localStorage
   - Refreshes every 5 minutes to stay current
   - Persists across browser sessions

2. **Individual Song Check Cache** (2 minutes)
   - Caches the result of each song check
   - Short 2-minute duration for quick updates
   - Checks against the cached library list
   - In-memory only (faster access)

### Why This Design?

- **Library catalog changes relatively quickly** → Cache for 5 minutes (when you add songs, they show up soon)
- **You might check the same album multiple times** → Cache individual checks for 2 minutes
- **Result**: Fast UI updates with minimal API calls, fresh data within 5 minutes

### When You View an Album

1. Plugin detects you're on an album view
2. Checks if library catalog is cached (1 hour)
3. If not cached, fetches your entire library once
4. For each song, checks if its ID is in the cached catalog
5. Displays checkmarks for songs found in library
6. Caches individual results for 2 minutes

## Performance & API Impact

### Typical Usage
- **First time**: 1 API call to fetch entire library (~1-5 seconds for large libraries)
- **Next album within 5 minutes**: 0 API calls (uses cached library)
- **Revisiting same album within 2 minutes**: 0 processing (uses cached results)

### Example: Large Library (5000+ songs)
- Initial fetch: ~5 seconds, 50-100 API calls (one-time cost)
- Cached for 5 minutes: Instant checkmarks for all subsequent albums
- After 5 minutes: Refreshes automatically in background (~1-2 seconds)

This is extremely efficient compared to checking each song individually!

## Manual Commands

The plugin exposes two commands you can run in the browser console:

```javascript
// Force refresh library data and re-check all songs
refreshLibraryCheckmarks()

// Clear all caches (library list + individual song checks)
clearLibraryCache()
```

## Compatibility

- **Cider Version**: 2.5.0+
- **Apple Music**: Requires an active Apple Music subscription
- **Platforms**: Windows, macOS, Linux

## Troubleshooting

### Checkmarks not appearing?
1. Make sure you're viewing an album (not a playlist)
2. Try running `refreshLibraryCheckmarks()` in console
3. Check that songs are actually in your library (add them if not)

### Checkmarks showing for favorited songs?
- This is intentional - favorited songs show the star instead of the checkmark

### Performance issues with large libraries?
- The initial library fetch takes 1-5 seconds for 5000+ songs
- After that, it's cached for an hour with instant results
- Try `clearLibraryCache()` if data seems stale

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Prepare marketplace package
pnpm prepare-marketplace
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Built with [Cider PluginKit](https://github.com/ciderapp/pluginkit)

---

Made with ❤️ for the Cider community
