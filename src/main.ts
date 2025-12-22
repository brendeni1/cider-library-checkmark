import { definePluginContext } from "@ciderapp/pluginkit";
import PluginConfig from "./plugin.config";

interface LibraryCacheEntry {
  isInLibrary: boolean;
  timestamp: number;
}

interface LibrarySnapshot {
  catalogIds: string[];
  timestamp: number;
}

/**
 * Defining the plugin context
 */
const { plugin } = definePluginContext({
  ...PluginConfig,
  setup() {
    const checkCache = new Map<string, LibraryCacheEntry>();
    const CHECK_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes - how long to cache individual song library status checks
    const LIBRARY_CACHE_DURATION = 60 * 60 * 1000; // 1 hour - how long to cache the full library catalog ID list
    
    let libraryCatalogIds: Set<string> | null = null;
    let libraryFetchTimestamp = 0;
    let observer: MutationObserver | null = null;
    let lastProcessedUrl = '';
    let isProcessing = false;

    console.log("🎵 Library Checkmark Plugin initializing...");

    /**
     * Load library snapshot from localStorage
     */
    function loadLibrarySnapshot(): LibrarySnapshot | null {
      try {
        const stored = localStorage.getItem('cider-library-checkmark-snapshot');
        if (!stored) return null;
        
        const snapshot = JSON.parse(stored) as LibrarySnapshot;
        const age = Date.now() - snapshot.timestamp;
        
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
     * This checks individual song library status cache entries.
     * After 2 minutes, the status for a specific song is rechecked against the library catalog.
     */
    function isCacheValid(songId: string): boolean {
      const entry = checkCache.get(songId);
      if (!entry) return false;
      
      const now = Date.now();
      if (now > entry.timestamp + CHECK_CACHE_DURATION) {
        checkCache.delete(songId);
        return false;
      }
      
      return true;
    }

    /**
     * Update cache with library status
     * Stores whether a specific song is in the library for 2 minutes.
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
      // Check URL hash
      const hash = window.location.hash;
      
      // Must contain /album/ in URL
      if (!hash.includes('/album/')) {
        return false;
      }
      
      // Must NOT contain /playlist/
      if (hash.includes('/playlist/')) {
        return false;
      }
      
      // Check for album-view class in DOM
      const albumView = document.querySelector('.album-view');
      if (!albumView) {
        return false;
      }
      
      // Make sure it's not a playlist-view
      const playlistView = document.querySelector('.playlist-view');
      if (playlistView) {
        return false;
      }
      
      return true;
    }

    /**
     * Add checkmark indicator to a track element
     */
    function addIndicator(trackElement: HTMLElement, isInLibrary: boolean): void {
      const existing = trackElement.querySelector('.library-check-indicator');
      if (existing) existing.remove();

      // Find the rating section
      const ratingSection = trackElement.querySelector('.rating') as HTMLElement;
      if (!ratingSection) return;

      // Check if there's already any content in the rating section (favorite star/button)
      const hasFavorite = ratingSection.querySelector('.app-chrome-button.active, svg, i, .fa-star, [class*="star"]');
      
      // If song is not in library, clear any checkmark and return
      if (!isInLibrary) {
        ratingSection.classList.remove('has-library-check');
        const checkmark = ratingSection.querySelector('.library-check-indicator');
        if (checkmark) checkmark.remove();
        return;
      }

      // If there's already any content in the rating section (favorite star/button), don't add checkmark
      if (hasFavorite || ratingSection.children.length > 0) {
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
     * 
     * This fetches the complete list of catalog IDs for all songs in your library.
     * The list is cached for 1 hour in both memory and localStorage to avoid expensive API calls.
     * 
     * Cache strategy:
     * - LIBRARY_CACHE_DURATION (1 hour): Full library catalog ID list
     * - CHECK_CACHE_DURATION (2 minutes): Individual song library status results
     * 
     * This means the plugin checks against a cached library list, but refreshes that list hourly.
     * Individual song checks are cached for 2 minutes to quickly respond to recent changes.
     */
    async function getLibraryCatalogIds(): Promise<Set<string>> {
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
          
          // Show progress every 500 songs
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

        // Extract catalog IDs
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

        // Save to both memory and localStorage
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
        // Clear indicators if we navigated away from album view
        document.querySelectorAll('.library-check-indicator').forEach(el => el.remove());
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

      // Collect songs that need checking
      const songsToCheck: Array<{ id: string; element: HTMLElement }> = [];
      let cachedCount = 0;

      trackElements.forEach((track) => {
        const element = track as HTMLElement;
        const songId = element.getAttribute('data-item-id');
        
        if (!songId) return;

        if (forceRefresh) {
          const existing = element.querySelector('.library-check-indicator');
          if (existing) existing.remove();
        } else {
          if (element.querySelector('.library-check-indicator')) return;
        }

        // Check cache first
        if (!forceRefresh && isCacheValid(songId)) {
          const entry = checkCache.get(songId);
          if (entry) {
            addIndicator(element, entry.isInLibrary);
            cachedCount++;
            return;
          }
        }

        songsToCheck.push({ id: songId, element });
      });

      if (cachedCount > 0) {
        console.log(`💾 Used cache for ${cachedCount} tracks`);
      }

      if (songsToCheck.length > 0) {
        console.log(`🔍 Checking ${songsToCheck.length} songs...`);
        
        // Get library catalog IDs
        const libraryCatalogIds = await getLibraryCatalogIds();

        // Check each song
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

        .library-check-indicator {
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

        .ri-list-item:hover .library-check-indicator {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Invalidate library cache (call when library changes)
     * Clears both the full library catalog list and individual song check results.
     * Forces a fresh fetch on next check.
     */
    function invalidateLibraryCache(): void {
      console.log('🔄 Invalidating library cache');
      libraryCatalogIds = null;
      libraryFetchTimestamp = 0;
      checkCache.clear();
      localStorage.removeItem('cider-library-checkmark-snapshot');
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

      // Manual commands
      (window as any).refreshLibraryCheckmarks = () => {
        invalidateLibraryCache();
        processVisibleSongs(true);
      };

      (window as any).clearLibraryCache = invalidateLibraryCache;
    }, 1000);

    console.log("✅ Library Checkmark Plugin loaded!");
    console.log("💾 Cache Strategy:");
    console.log("   - Library catalog list: 1 hour (localStorage + memory)");
    console.log("   - Individual song checks: 2 minutes (memory)");
    console.log("🎯 Album view only (playlists excluded)");
    console.log("💡 Commands: refreshLibraryCheckmarks() | clearLibraryCache()");
  },
});

export default plugin;
