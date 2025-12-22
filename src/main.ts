import { definePluginContext } from "@ciderapp/pluginkit";
import { defineCustomElement } from "vue";
import PluginConfig from "./plugin.config";
import MySettings from "./components/MySettings.vue";

interface LibraryCacheEntry {
  isInLibrary: boolean;
  timestamp: number;
}

interface LibrarySnapshot {
  catalogIds: string[];
  timestamp: number;
}

interface PluginSettings {
  libraryCacheDuration: number;
  singleSongCacheDuration: number;
  enableLoadingIcons: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
  libraryCacheDuration: 5, // minutes
  singleSongCacheDuration: 2, // minutes
  enableLoadingIcons: true,
};

/**
 * Defining the plugin context
 */
const { plugin, setupConfig, customElementName } = definePluginContext({
  ...PluginConfig,
  setup() {
    const checkCache = new Map<string, LibraryCacheEntry>();
    
    // Setup configuration with defaults
    const cfg = setupConfig(DEFAULT_SETTINGS);
    
    // Expose config to window for settings component
    (window as any).libraryCheckmarkConfig = cfg;
    
    let libraryCatalogIds: Set<string> | null = null;
    let libraryFetchTimestamp = 0;
    let observer: MutationObserver | null = null;
    let lastProcessedUrl = '';
    let isProcessing = false;

    console.log("🎵 Library Checkmark Plugin initializing...");

    // Register settings custom element
    customElements.define(
      customElementName("settings"),
      defineCustomElement(MySettings, {
        shadowRoot: false,
      })
    );

    // Set the settings element for Cider
    this.SettingsElement = customElementName("settings");

    /**
     * Get current settings
     */
    function getSettings(): PluginSettings {
      return cfg.value;
    }

    /**
     * Get cache durations in milliseconds
     */
    function getCacheDurations() {
      const settings = getSettings();
      return {
        CHECK_CACHE_DURATION: settings.singleSongCacheDuration * 60 * 1000,
        LIBRARY_CACHE_DURATION: settings.libraryCacheDuration * 60 * 1000,
      };
    }

    /**
     * Load library snapshot from localStorage
     */
    function loadLibrarySnapshot(): LibrarySnapshot | null {
      try {
        const stored = localStorage.getItem('cider-library-checkmark-snapshot');
        if (!stored) return null;
        
        const snapshot = JSON.parse(stored) as LibrarySnapshot;
        const age = Date.now() - snapshot.timestamp;
        const { LIBRARY_CACHE_DURATION } = getCacheDurations();
        
        if (age > LIBRARY_CACHE_DURATION) {
          console.log('📦 Library snapshot expired');
          return null;
        }
        
        console.log(`📦 Loaded library snapshot: ${snapshot.catalogIds.length} catalog IDs (age: ${Math.floor(age / 60000)}min)`);
        return snapshot;
      } catch (error) {
        console.error('❌ Failed to load library snapshot:', error);
        return null;
      }
    }

    /**
     * Save library snapshot to localStorage
     */
    function saveLibrarySnapshot(catalogIds: string[]): void {
      try {
        const snapshot: LibrarySnapshot = {
          catalogIds,
          timestamp: Date.now(),
        };
        localStorage.setItem('cider-library-checkmark-snapshot', JSON.stringify(snapshot));
        console.log(`💾 Saved library snapshot: ${catalogIds.length} catalog IDs`);
      } catch (error) {
        console.error('❌ Failed to save library snapshot:', error);
      }
    }

    /**
     * Check if cache entry is still valid
     */
    function isCacheValid(songId: string): boolean {
      const entry = checkCache.get(songId);
      if (!entry) return false;
      
      const now = Date.now();
      const { CHECK_CACHE_DURATION } = getCacheDurations();
      if (now > entry.timestamp + CHECK_CACHE_DURATION) {
        checkCache.delete(songId);
        return false;
      }
      
      return true;
    }

    /**
     * Update cache with library status
     */
    function updateCache(songId: string, isInLibrary: boolean): void {
      checkCache.set(songId, {
        isInLibrary,
        timestamp: Date.now(),
      });
    }

    /**
     * Check if we're on an album view (NOT playlist)
     */
    function isAlbumView(): boolean {
      const hash = window.location.hash;
      
      if (!hash.includes('/album/')) {
        return false;
      }
      
      if (hash.includes('/playlist/')) {
        return false;
      }
      
      const albumView = document.querySelector('.album-view');
      if (!albumView) {
        return false;
      }
      
      const playlistView = document.querySelector('.playlist-view');
      if (playlistView) {
        return false;
      }
      
      return true;
    }

    /**
     * Check if rating section has favorite content
     */
    function hasFavoriteContent(ratingSection: HTMLElement): boolean {
      return !!ratingSection.querySelector('.app-chrome-button.active, svg:not(.library-check-indicator svg):not(.library-loading-indicator svg), i, .fa-star, [class*="star"]');
    }

    /**
     * Add loading indicator to a track element
     */
    function addLoadingIndicator(trackElement: HTMLElement): void {
      const settings = getSettings();
      if (!settings.enableLoadingIcons) return;

      const ratingSection = trackElement.querySelector('.rating') as HTMLElement;
      if (!ratingSection) return;

      // Don't show loading icon if there's already favorite content
      if (hasFavoriteContent(ratingSection)) return;

      // Remove any existing indicators
      const existing = ratingSection.querySelector('.library-check-indicator, .library-loading-indicator');
      if (existing) existing.remove();

      // Add loading spinner
      const loader = document.createElement('div');
      loader.className = 'library-loading-indicator';
      loader.title = 'Checking library...';
      loader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      `;

      ratingSection.appendChild(loader);
    }

    /**
     * Add checkmark indicator to a track element
     */
    function addIndicator(trackElement: HTMLElement, isInLibrary: boolean): void {
      const ratingSection = trackElement.querySelector('.rating') as HTMLElement;
      if (!ratingSection) return;

      // Remove any existing indicators (including loading)
      const existing = ratingSection.querySelectorAll('.library-check-indicator, .library-loading-indicator');
      existing.forEach(el => el.remove());

      // If song is not in library, clear any checkmark and return
      if (!isInLibrary) {
        ratingSection.classList.remove('has-library-check');
        return;
      }

      // If there's already favorite content in the rating section, don't add checkmark
      if (hasFavoriteContent(ratingSection) || ratingSection.children.length > 0) {
        ratingSection.classList.remove('has-library-check');
        return;
      }

      // Add checkmark inside the rating section
      ratingSection.classList.add('has-library-check');
      const indicator = document.createElement('div');
      indicator.className = 'library-check-indicator';
      indicator.title = 'In Library';
      indicator.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      ratingSection.appendChild(indicator);
    }

    /**
     * Get library catalog IDs (from cache or fresh fetch)
     */
    async function getLibraryCatalogIds(): Promise<Set<string>> {
      const { LIBRARY_CACHE_DURATION } = getCacheDurations();
      
      // Return cached if still valid
      if (libraryCatalogIds && (Date.now() - libraryFetchTimestamp < LIBRARY_CACHE_DURATION)) {
        console.log('✅ Using in-memory library cache');
        return libraryCatalogIds;
      }

      // Try loading from localStorage
      const snapshot = loadLibrarySnapshot();
      if (snapshot) {
        libraryCatalogIds = new Set(snapshot.catalogIds);
        libraryFetchTimestamp = snapshot.timestamp;
        return libraryCatalogIds;
      }

      // Fetch fresh data
      console.log('📚 Fetching library (this may take a moment for large libraries)...');
      
      try {
        const musicKit = (window as any).MusicKit?.getInstance();
        const developerToken = musicKit?.developerToken;
        const userToken = musicKit?.musicUserToken;

        if (!developerToken || !userToken) {
          return new Set();
        }

        let allLibrarySongs: any[] = [];
        let offset = 0;
        const limit = 100;
        
        while (true) {
          const url = `https://amp-api.music.apple.com/v1/me/library/songs?limit=${limit}&offset=${offset}`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'accept': '*/*',
              'authorization': `Bearer ${developerToken}`,
              'media-user-token': userToken,
            },
          });

          if (!response.ok) break;
          
          const data = await response.json();
          const songs = data.data || [];
          
          if (songs.length === 0) break;
          
          allLibrarySongs = allLibrarySongs.concat(songs);
          
          if (allLibrarySongs.length % 500 === 0) {
            console.log(`  Fetched ${allLibrarySongs.length} songs...`);
          }
          
          if (songs.length < limit) break;
          
          offset += limit;
          
          if (offset >= 25000) {
            console.warn('⚠️ Hit 25k song limit');
            break;
          }
        }

        console.log(`✅ Fetched ${allLibrarySongs.length} total library songs`);

        const catalogIds = new Set<string>();
        allLibrarySongs.forEach(song => {
          if (song.attributes?.playParams?.catalogId) {
            catalogIds.add(String(song.attributes.playParams.catalogId));
          }
          if (song.attributes?.playParams?.id) {
            catalogIds.add(String(song.attributes.playParams.id));
          }
        });

        console.log(`📊 Found ${catalogIds.size} unique catalog IDs`);

        libraryCatalogIds = catalogIds;
        libraryFetchTimestamp = Date.now();
        saveLibrarySnapshot(Array.from(catalogIds));

        return catalogIds;
        
      } catch (error) {
        console.error('❌ Library fetch error:', error);
        return new Set();
      }
    }

    /**
     * Process visible songs on album view
     */
    async function processVisibleSongs(forceRefresh: boolean = false): Promise<void> {
      const currentUrl = window.location.hash;
      
      if (!isAlbumView()) {
        document.querySelectorAll('.library-check-indicator, .library-loading-indicator').forEach(el => el.remove());
        return;
      }
      
      if (isProcessing) {
        console.log('⏳ Already processing, skipping...');
        return;
      }
      
      if (!forceRefresh && currentUrl === lastProcessedUrl) return;

      isProcessing = true;
      lastProcessedUrl = currentUrl;
      console.log('🎵 Processing album:', currentUrl);

      const trackElements = document.querySelectorAll('.ri-list-item[data-item-id]');
      console.log(`📋 Found ${trackElements.length} tracks`);

      const songsToCheck: Array<{ id: string; element: HTMLElement }> = [];
      let cachedCount = 0;

      trackElements.forEach((track) => {
        const element = track as HTMLElement;
        const songId = element.getAttribute('data-item-id');
        
        if (!songId) return;

        if (forceRefresh) {
          const existing = element.querySelectorAll('.library-check-indicator, .library-loading-indicator');
          existing.forEach(el => el.remove());
        } else {
          if (element.querySelector('.library-check-indicator')) return;
        }

        if (!forceRefresh && isCacheValid(songId)) {
          const entry = checkCache.get(songId);
          if (entry) {
            addIndicator(element, entry.isInLibrary);
            cachedCount++;
            return;
          }
        }

        // Show loading indicator
        addLoadingIndicator(element);
        songsToCheck.push({ id: songId, element });
      });

      if (cachedCount > 0) {
        console.log(`💾 Used cache for ${cachedCount} tracks`);
      }

      if (songsToCheck.length > 0) {
        console.log(`🔍 Checking ${songsToCheck.length} songs...`);
        
        const libraryCatalogIds = await getLibraryCatalogIds();

        let foundCount = 0;
        songsToCheck.forEach(({ id, element }) => {
          const isInLibrary = libraryCatalogIds.has(id);
          updateCache(id, isInLibrary);
          addIndicator(element, isInLibrary);
          if (isInLibrary) foundCount++;
        });

        console.log(`✅ ${foundCount}/${songsToCheck.length} in library`);
      }

      isProcessing = false;
    }

    /**
     * Setup DOM observer
     */
    function setupObserver(): void {
      let debounceTimer: number | null = null;
      
      observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          processVisibleSongs();
        }, 1000);
      });

      const targetNode = document.querySelector('.app-content') || document.body;
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }

    /**
     * Add CSS styles
     */
    function addStyles(): void {
      const style = document.createElement('style');
      style.textContent = `
        .rating {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
        }

        .rating.has-library-check {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .library-check-indicator,
        .library-loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .library-check-indicator svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }

        .library-loading-indicator svg {
          animation: library-spin 1s linear infinite;
          opacity: 0.5;
        }

        @keyframes library-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .ri-list-item:hover .library-check-indicator,
        .ri-list-item:hover .library-loading-indicator {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Invalidate library cache
     */
    function invalidateLibraryCache(): void {
      console.log('🔄 Invalidating library cache');
      libraryCatalogIds = null;
      libraryFetchTimestamp = 0;
      checkCache.clear();
      localStorage.removeItem('cider-library-checkmark-snapshot');
    }

    /**
     * Manual refetch
     */
    async function manualRefetch(): Promise<void> {
      console.log('🔄 Manual refetch triggered');
      invalidateLibraryCache();
      await processVisibleSongs(true);
    }

    // Initialize plugin
    setTimeout(() => {
      console.log('🎬 Starting plugin...');
      addStyles();
      setupObserver();
      processVisibleSongs();
      
      window.addEventListener('hashchange', () => {
        setTimeout(() => processVisibleSongs(), 500);
      });

      // Expose API for settings UI buttons
      (window as any).libraryCheckmarkPlugin = {
        refreshLibraryCheckmarks: manualRefetch,
        clearLibraryCache: invalidateLibraryCache,
      };

      // Legacy commands for backwards compatibility
      (window as any).refreshLibraryCheckmarks = manualRefetch;
      (window as any).clearLibraryCache = invalidateLibraryCache;
      
      const settings = getSettings();
      console.log("✅ Library Checkmark Plugin loaded!");
      console.log("💾 Cache Strategy:");
      console.log(`   - Library catalog list: ${settings.libraryCacheDuration} minutes (localStorage + memory)`);
      console.log(`   - Individual song checks: ${settings.singleSongCacheDuration} minutes (memory)`);
      console.log(`   - Loading icons: ${settings.enableLoadingIcons ? 'enabled' : 'disabled'}`);
      console.log("🎯 Album view only (playlists excluded)");
      console.log("💡 Access settings in plugin settings page");
    }, 1000);
  },
});

export default plugin;
