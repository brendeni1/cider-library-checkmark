/**
 * Plugin configuration.
 */
export default {
    /**
     * Custom element prefix, must be unique
     */
    ce_prefix: 'library-checkmark',
    identifier: 'brendeni1.library-checkmark',
    name: 'Library Checkmark',
    description: 'Shows a minimal checkmark icon on album tracks that are in your library',
    version: '1.1.0',
    author: 'brenden.i1',
    repo: 'https://github.com/brendeni1/cider-library-checkmark',
    entry: {
        'plugin.js': {
            type: 'main',
        }
    },
    /**
     * Settings configuration
     */
    SettingsSection: {
        libraryCacheDuration: {
            type: 'number',
            name: 'Library Cache Duration (minutes)',
            description: 'How long to cache the complete library list (10+ minutes recommended)',
            default: 10,
            min: 1,
            max: 60,
        },
        singleSongCacheDuration: {
            type: 'number',
            name: 'Single Song Cache Duration (minutes)',
            description: 'How long to cache individual song library status (5+ minutes recommended)',
            default: 5,
            min: 1,
            max: 30,
        },
        enableLoadingIcons: {
            type: 'toggle',
            name: 'Enable Loading Icons',
            description: 'Show spinning icon while checking library status',
            default: true,
        },
        'divider-actions': {
            type: 'divider',
        },
        'button-refetch': {
            type: 'button',
            name: 'Refetch Library',
            description: 'Manually refetch your library and refresh all checkmarks',
            text: 'Refetch Now',
            onclick: 'window.libraryCheckmarkPlugin?.refreshLibraryCheckmarks()',
        },
        'button-clear-cache': {
            type: 'button',
            name: 'Clear Cache',
            description: 'Clear all cached library data (forces fresh fetch on next check)',
            text: 'Clear Cache',
            onclick: 'window.libraryCheckmarkPlugin?.clearLibraryCache()',
        },
    },
}
