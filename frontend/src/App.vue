<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import Swal from 'sweetalert2';
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import PageScrollbar from '@/components/common/PageScrollbar.vue';
const tactics = tacticsStore();
const magma = magmaStore();
// Load the ATT&CK catalog (public/tactics_and_techniques_by_domain.json) into the Pinia store.
onMounted(() => {
  tactics.fetchTactics().catch((error) => {
    console.error('Failed to fetch tactics:', error);
    Swal.fire({
      icon: 'error',
      titleText: 'The ATT&CK data was not loaded',
      text: `Could not load the ATT&CK data (tactics_and_techniques_by_domain.json): ${(error as Error).message}. Please reload the page.`,
    });
  });
});

// Ask for confirmation when leaving or refreshing the page would lose MaGMa work: changes since the last load or save.
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (magma.hasUnsavedChanges()) {
    event.preventDefault();
  }
};
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<!-- The page frame: navigation, domain buttons and the current page (the routes are in router/index.ts). -->
<template>
  <div class="app">
    <header class="app-header">
      <div class="navigation">
        <RouterLink class="nav" to="/" exact-active-class="selected">DeTT&CT</RouterLink>
        <RouterLink class="nav" to="/insights" exact-active-class="selected">Insights</RouterLink>
        <RouterLink class="nav" to="/magma" exact-active-class="selected">MaGMa</RouterLink>
      </div>

      <div class="domain-switcher">
        <button
          :class="{ dom: true, selected: tactics.domain === 'enterprise-attack' }"
          @click="tactics.setDomain('enterprise-attack')"
        >
          Enterprise
        </button>
        <button
          :class="{ dom: true, selected: tactics.domain === 'mobile-attack' }"
          @click="tactics.setDomain('mobile-attack')"
        >
          Mobile
        </button>
        <button
          :class="{ dom: true, selected: tactics.domain === 'ics-attack' }"
          @click="tactics.setDomain('ics-attack')"
        >
          ICS
        </button>
      </div>
    </header>

    <main>
      <div class="content">
        <RouterView />
      </div>
    </main>

    <PageScrollbar />
  </div>
</template>

<style>
/* The mount point in index.html (#app) and the page frame (.app) share this style. */
#app,
.app {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding: 0;
}

/* The page keeps 0.5rem (8px) free at the left and right. The parts that scroll sideways (the matrix, the heatmap and
   the MaGMa sheets) run under this margin to the window edges, and start and end 0.5rem from them. */
.app {
  padding: 0 0.5rem 1%;
}

/* The header: a band across the whole window with the two menu bars in it, and a thin line below it. The page content
   starts 5px below it. */
.app-header {
  margin: 0 -0.5rem 5px;
  padding: 8px 0.5rem 5px; /* with the line below it, the band ends 6px below the menu bars */
  background-color: var(--color-header);
  border-bottom: 1px solid var(--color-header-line);
}

.navigation,
.domain-switcher {
  display: flex;
  justify-content: space-around;
  max-width: 960px;
  padding: 2px;
  background-color: var(--color-menu-bar);
  border: 1px solid var(--color-header-line);
  border-radius: var(--radius-frame);
}

/* The navigation is close to the domain buttons below it. */
.navigation {
  margin-bottom: 3px;
}

/* The buttons of a menu bar are joined; a thin line separates them, except next to the chosen one. */
.nav,
.dom {
  position: relative;
  flex-grow: 1;
  width: 0; /* This makes the navigation buttons and the domain buttons all have the same width. */
  margin: 2px;
  padding: 4px 0;
  background-color: transparent;
  border: none;
  border-radius: var(--radius-box);
  color: var(--color-menu-text);
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: 0.1s;
}

.nav:hover,
.dom:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.nav + .nav::before,
.dom + .dom::before {
  content: '';
  position: absolute;
  left: -3px;
  top: 3px;
  bottom: 3px;
  border-left: 1px solid var(--color-header-line);
}

.nav.selected,
.dom.selected {
  background-color: var(--color-accent);
  color: white;
}

.nav.selected::before,
.dom.selected::before,
.selected + .nav::before,
.selected + .dom::before {
  display: none;
}
</style>
