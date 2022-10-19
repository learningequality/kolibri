<template>
  <aside
    class="pdf-sidebar"
    :style="{
      background: $themeTokens.surface,
    }"
  >
    <nav>
      <KGrid gutter="0">
        <KGridItem
          v-for="tab in tabs"
          :key="tab.name"
          :ref="tab.name"
          :layout12="{ span: 4, alignment: 'center' }"
          :style="{
            background: selectedTab === tab.name ?
              $themeTokens.annotation :
              $themeTokens.transparent,
            padding: '8px 0',
            cursor: 'pointer',
            borderRadius: '2px',
            opacity: tab.disabled ? 0.5 : 1,
            pointerEvents: tab.disabled ? 'none' : 'auto',
          }"
        > 
          <div
            class="tab"
            :tabindex="tab.disabled ? -1 : 0"
            :aria-label="tab.name"
            @click="selectTab(tab.name)"
            @keydown.enter="selectTab(tab.name)"
            @keydown.space="selectTab(tab.name)"
          >
            <KIcon
              :icon="tab.icon"
              :style="{
                fill: selectedTab === tab.name ?
                  $themeTokens.textInverted :
                  $themeTokens.text,
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
        </KGridItem>
      </KGrid> 
    </nav>
    <div class="sidebar-content">
      <template v-if="selectedTab === 'bookmarks'">
        <Bookmarks
          :outline="outline"
          :goToDestination="goToDestination"
        />
      </template>
      <template v-if="selectedTab === 'preview'">
        <span> Preview </span>
      </template>
      <template v-if="selectedTab === 'annotations'">
        <span> Annotations </span>
      </template>
    </div>
  </aside>
</template>
<script>
  import Bookmarks from './Bookmarks';

  export default {
    name: 'BookmarkItem',
    components: {
      Bookmarks,
    },
    props: {
      outline: {
        type: Array,
        required: true,
      },
      goToDestination: {
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
            label: 'Bookmarks',
            icon: 'list',
            disabled: false,
          },
          {
            name: 'preview',
            label: 'Preview',
            icon: 'channel',
            disabled: true,
          },
          {
            name: 'annotations',
            label: 'Annotations',
            icon: 'edit',
            disabled: true,
          },
        ],
      };
    },
    methods: {
      selectTab(tabName) {
        this.selectedTab = tabName;
      },
    },
    watch: {
      outline() {
        this.tabs[0].disabled = !this.outline || !this.outline.length;
        this.selectedTab = this.outline && this.outline.length ? 'bookmarks' : 'preview';
      },
    },
  }
</script>
<style scoped lang="scss">
  .pdf-sidebar{
    height: 100%;
    box-shadow: inset -1px 2px 8px rgba(0, 0, 0, 0.16);
  }
  .tab:focus-visible {
    outline-width: medium;
    outline-style: solid;
  }
</style>