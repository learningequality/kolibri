<template>

  <aside
    class="pdf-sidebar"
    :style="{
      background: $themeTokens.surface,
    }"
  >
    <nav>
      <div
        v-if="tabs.filter(t => !t.disabled).length > 1"
        :style="{ display: 'flex' }"
      >
        <div
          v-for="tab in tabs"
          :key="tab.name"
          :ref="tab.name"
          :style="{
            background:
              selectedTab === tab.name ? $themeTokens.annotation : $themeTokens.transparent,
            cursor: 'pointer',
            borderRadius: '2px',
            opacity: tab.disabled ? 0.5 : 1,
            pointerEvents: tab.disabled ? 'none' : 'auto',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }"
        >
          <div
            class="tab"
            :tabindex="tab.disabled ? -1 : 0"
            :aria-label="tab.label"
            role="button"
            @click="selectTab(tab.name)"
            @keydown.enter="selectTab(tab.name)"
            @keydown.space="selectTab(tab.name)"
          >
            <KIcon
              :icon="tab.icon"
              :style="{
                fill: selectedTab === tab.name ? $themeTokens.textInverted : $themeTokens.text,
                height: '24px',
                width: '24px',
              }"
            />
            <KTooltip
              :reference="tab.name"
              :refs="$refs"
            >
              {{ tab.label }}
            </KTooltip>
          </div>
        </div>
      </div>
      <div class="sidebar-content">
        <template v-if="selectedTab === 'bookmarks'">
          <Bookmarks
            :outline="outline"
            :goToDestination="goToDestination"
            :focusDestPage="focusDestPage"
          />
        </template>
        <template v-if="selectedTab === 'preview'">
          <span></span>
        </template>
        <template v-if="selectedTab === 'annotations'">
          <span></span>
        </template>
      </div>
    </nav>
  </aside>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import Bookmarks from './Bookmarks';

  export default {
    name: 'SideBar',
    components: {
      Bookmarks,
    },
    mixins: [commonCoreStrings],
    props: {
      outline: {
        type: Array,
        required: true,
      },
      goToDestination: {
        type: Function,
        required: true,
      },
      focusDestPage: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        selectedTab: 'bookmarks',
        tabs: [
          {
            name: 'bookmarks',
            label: this.coreString('bookmarksLabel'),
            icon: 'list',
            disabled: false,
          },
          {
            name: 'preview',
            label: '',
            icon: 'channel',
            disabled: true,
          },
          {
            name: 'annotations',
            label: '',
            icon: 'edit',
            disabled: true,
          },
        ],
      };
    },
    watch: {
      outline() {
        this.tabs[0].disabled = !this.outline || !this.outline.length;
        this.selectedTab = this.outline && this.outline.length ? 'bookmarks' : 'preview';
      },
    },
    methods: {
      selectTab(tabName) {
        this.selectedTab = tabName;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .pdf-sidebar {
    overflow-y: auto;
    @extend %dropshadow-2dp;
  }

  .tab:focus-visible {
    outline-width: 3px;
    outline-style: solid;
    outline-color: #8dc5b6;
    outline-offset: 4px;
  }

  .sidebar-content {
    overflow-y: auto;
  }

</style>
