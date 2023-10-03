<template>

  <div class="container">
    <KTabsList
      ref="tabsWrapper"
      class="tabs-wrapper"
      v-bind="$attrs"
      :activeTabId="activeTabId"
      :tabs="visibleTabs"
    >
      <template #tab="{ tab }">
        <slot name="tab" :tab="tab" :tabIsVisible="tabIsVisible(tab)"></slot>
      </template>
    </KTabsList>

    <!-- TODO Write issue in KDS to implement the default slot to render after the #tab slot -->
    <!-- This should be within the KTabsList to simplify rendering, but there is no slot.
      The absolute styling isn't as nice as if it were part of the flex container instead, but
      it ought to work -->
    <div style="position: absolute; right: 0; top: -7px;">
      <slot name="overflow" :overflowTabs="overflowTabs"></slot>
    </div>

  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';

  /**
   * @typedef   {Object}    Tab
   * @property  {string}    label
   * @property  {string}    id
   */

  export default {
    // TODO Rename this to TabsListWithOverflow as it will wrap stuff in a KTabsList
    name: 'TabsWithOverflow',
    setup() {
      const { windowWidth } = useKResponsiveWindow();
      return {
        windowWidth,
      };
    },
    props: {
      tabs: {
        type: Array,
        required: true,
      },
      activeTabId: {
        type: String,
        required: true,
      },
    },
    data() {
      return { mounted: false, overflowTabs: [] };
    },
    computed: {
      visibleTabs() {
        return this.tabs.filter(this.tabIsVisible);
      },
    },
    watch: {
      tabs() {
        this.$nextTick(() => {
          this.setOverflowTabs();
        });
      },
    },
    mounted() {
      this.mounted = true;
      this.setWrappingButtonTabIndex();
    },
    methods: {
      setOverflowTabs() {
        this.overflowTabs =
          this.mounted && this.windowWidth
            ? this.tabs.filter((_, idx) => {
                const tabRef = this.$refs.tabsWrapper.$el.children[idx];
                const tabRefTop = tabRef.offsetTop;

                const containerTop = this.$refs.tabsWrapper.$el.offsetTop;
                const containerBottom = containerTop + this.$refs.tabsWrapper.$el.clientHeight;

                console.log(tabRef, tabRefTop, containerTop, containerBottom);
                return tabRefTop >= containerBottom;
              })
            : [];
      },
      setWrappingButtonTabIndex() {
        for (const child of this.$refs.tabsWrapper.$el.children) {
          child.setAttribute('tabindex', -1);
        }
      },
      tabIsVisible(tab) {
        return !this.overflowTabs.map(t => t.id).includes(tab.id);
      },
    },
  };

</script>


<style scoped lang="scss">

  .tabs-wrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    height: 2.25em;
    overflow: hidden;
  }

  /deep/ .tab > button {
    max-width: calc(200px - 40px);
    text-overflow: ellipsis;

    /* We *need* the overflow to be hidden for our calculations of which to show work properly.
       The default value clips the outline during keyboard navigation so this ensures it is fully
       visible without overlapping the actual content */
    outline-offset: -0.25em !important;
  }

  /deep/ .tab {
    flex: 0 0 auto;
    height: 2.5em;
    overflow: visible; // Keep outline fully visible
  }

  .container {
    position: relative;
    max-height: 2.25em;
  }

</style>
