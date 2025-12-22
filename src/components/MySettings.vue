<script setup lang="ts">
import { computed } from "vue";

// Get the config from the window API that we exposed
const cfg = computed(() => {
  if (typeof window !== "undefined" && (window as any).libraryCheckmarkConfig) {
    return (window as any).libraryCheckmarkConfig.value;
  }
  return {
    libraryCacheDuration: 5,
    singleSongCacheDuration: 2,
    enableLoadingIcons: true,
  };
});

const updateSetting = (key: string, value: any) => {
  if (typeof window !== "undefined" && (window as any).libraryCheckmarkConfig) {
    (window as any).libraryCheckmarkConfig.value[key] = value;
  }
};

const refetchLibrary = () => {
  if ((window as any).libraryCheckmarkPlugin?.refreshLibraryCheckmarks) {
    (window as any).libraryCheckmarkPlugin.refreshLibraryCheckmarks();
  }
};

const clearCache = () => {
  if ((window as any).libraryCheckmarkPlugin?.clearLibraryCache) {
    (window as any).libraryCheckmarkPlugin.clearLibraryCache();
  }
};
</script>

<template>
  <div class="q-px-lg plugin-base">
    <h2 class="apple-heading">Library Checkmark Settings</h2>

    <div class="settings-section">
      <h3>Cache Settings</h3>
      <p class="settings-description">
        Configure how long to cache library data for optimal performance
      </p>

      <div class="setting-item">
        <label>
          <strong>Library Cache Duration (minutes)</strong>
          <p class="setting-description">
            How long to cache the complete library list (10+ minutes
            recommended)
          </p>
          <input
            type="number"
            class="c-input"
            :value="cfg.libraryCacheDuration"
            @input="
              updateSetting(
                'libraryCacheDuration',
                parseInt(($event.target as HTMLInputElement).value)
              )
            "
            min="1"
            max="60"
          />
        </label>
      </div>

      <div class="setting-item">
        <label>
          <strong>Single Song Cache Duration (minutes)</strong>
          <p class="setting-description">
            How long to cache individual song library status (5+ minutes
            recommended)
          </p>
          <input
            type="number"
            class="c-input"
            :value="cfg.singleSongCacheDuration"
            @input="
              updateSetting(
                'singleSongCacheDuration',
                parseInt(($event.target as HTMLInputElement).value)
              )
            "
            min="1"
            max="30"
          />
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3>Display Settings</h3>

      <div class="setting-item">
        <label>
          <input
            type="checkbox"
            :checked="cfg.enableLoadingIcons"
            @change="
              updateSetting(
                'enableLoadingIcons',
                ($event.target as HTMLInputElement).checked
              )
            "
          />
          <strong>Enable Loading Icons</strong>
        </label>
        <p class="setting-description">
          Show spinning icon while checking library status
        </p>
      </div>
    </div>

    <div class="settings-section">
      <h3>Actions</h3>

      <div class="setting-item">
        <button class="c-btn primary" @click="refetchLibrary">
          Refetch Library
        </button>
        <p class="setting-description">
          Manually refetch your library and refresh all checkmarks
        </p>
      </div>

      <div class="setting-item">
        <button class="c-btn" @click="clearCache">Clear Cache</button>
        <p class="setting-description">
          Clear all cached library data (forces fresh fetch on next check)
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  margin-bottom: 2rem;
}

.settings-section h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.settings-description {
  color: var(--textSecondary, #888);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.setting-item {
  margin-bottom: 1.5rem;
}

.setting-item label {
  display: block;
}

.setting-item strong {
  display: block;
  margin-bottom: 0.25rem;
}

.setting-description {
  color: var(--textSecondary, #888);
  font-size: 0.85rem;
  margin: 0.25rem 0 0.5rem 0;
}

.c-input {
  width: 100%;
  max-width: 200px;
  padding: 0.5rem;
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  background: var(--inputBackground, #1a1a1a);
  color: var(--text, #fff);
}

.c-btn {
  margin-right: 0.5rem;
}
</style>
