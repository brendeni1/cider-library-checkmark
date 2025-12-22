# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-22

### Added
- **Settings Page**: Full-featured settings interface accessible from Cider plugin settings
  - Configurable library cache duration (1-60 minutes, default: 5)
  - Configurable single song cache duration (1-30 minutes, default: 2)
  - Toggle for enabling/disabling loading icons
  - Manual "Refetch Library" button to force library refresh
  - Manual "Clear Cache" button to clear all cached data
- **Loading Icons**: Optional spinning indicators shown while checking library status
  - Respects the "Enable Loading Icons" setting
  - Automatically hidden when song is favorited (same behavior as checkmarks)
  - Smooth CSS animation with proper opacity transitions
- **Reactive Configuration**: Settings are now reactive and update plugin behavior in real-time
  - Cache durations dynamically adjust based on settings
  - Changes persist across sessions via Cider's config system
- **Enhanced Console Logging**: Plugin startup now displays current settings configuration

### Changed
- **Settings System**: Migrated from hardcoded values to Cider's `setupConfig` system
  - Settings are now stored and managed through Cider's configuration
  - All settings persist automatically
- **Cache Management**: Improved cache invalidation when settings are changed
  - Changing cache durations automatically invalidates existing caches
  - Ensures settings take effect immediately
- **Code Organization**: Refactored settings management into dedicated functions
  - `getSettings()` for retrieving current configuration
  - `getCacheDurations()` for calculating durations in milliseconds
- **Loading Indicator Logic**: Extracted favorite content check into reusable `hasFavoriteContent()` function

### Fixed
- Loading icons now properly respect favorited songs (won't show if song is favorited)
- TypeScript compilation errors from unused variables
- YAML serialization issues with function-based settings configuration

### Technical
- Added Vue component for settings UI (`MySettings.vue`)
- Exposed configuration to window object for settings component access
- Registered custom element for settings page
- Updated plugin version to 1.1.0

---

## [1.0.0] - 2024-12-XX

### Added
- Initial release
- Shows checkmark icons on album tracks that are in your library
- Two-tier caching system:
  - Library catalog cache (5 minutes)
  - Individual song check cache (2 minutes)
- localStorage persistence for library snapshots
- Automatic DOM observer for dynamic track detection
- Album view only (excludes playlists)
- Smart detection to avoid showing checkmarks on favorited songs
- Support for libraries up to 25,000 songs
- Browser console commands for manual control:
  - `refreshLibraryCheckmarks()`
  - `clearLibraryCache()`
- Comprehensive logging for debugging
- CSS animations and hover effects

### Technical Details
- Built with TypeScript and Vue 3
- Uses Cider PluginKit API
- Minimal checkmark SVG icons with drop shadow
- Debounced mutation observer (1 second delay)
- Batch processing of track elements
- Smart favorite detection to prevent UI conflicts

---

## Release Notes

### v1.1.0 Highlights
This release focuses on **user customization and transparency**. The new settings page gives you full control over cache behavior and visual preferences. Loading icons provide better feedback during library checks, and the enhanced configuration system ensures your preferences persist across sessions.

### Migration from 1.0.0 to 1.1.0
No migration steps required. Existing localStorage cache will continue to work. Settings will use default values on first launch and can be customized through the new settings page.
