<template>

  <div class="container">
    <KTabsList
      ref="tabsWrapper"
      class="tabs-wrapper"
      v-bind="$attrs"
      :activeTabId="activeTabId"
      :tabs="tabs"
      @click="id => $emit('click', id)"
    >
      <template #tab="{ tab }">
        <slot
          name="tab"
          :tab="tab"
          :tabIsVisible="tabIsVisible(tab)"
        ></slot>
      </template>
    </KTabsList>

    <!-- TODO Write issue in KDS to implement the default slot to render after the #tab slot -->
    <!-- This should be within the KTabsList to simplify rendering, but there is no slot.
      The absolute styling isn't as nice as if it were part of the flex container instead, but
      it ought to work -->
    <div class="more-button">
      <slot
        name="overflow"
        :overflowTabs="overflowTabs"
      ></slot>
    </div>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

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
    watch: {
      tabs() {
        this.$nextTick(() => {
          this.setOverflowTabs();
          this.setTabindex();
        });
      },
    },
    mounted() {
      this.mounted = true;
      this.$nextTick(() => {
        this.setOverflowTabs();
        this.setTabindex();
      });
    },
    methods: {
      setTabindex() {
        Array.from(this.$refs.tabsWrapper.$el.children).forEach(tab => {
          tab.setAttribute('tabindex', 0);
        });
      },
      setOverflowTabs() {
        this.overflowTabs =
          this.mounted && this.windowWidth
            ? this.tabs.filter((_, idx) => {
              const tabRef = this.$refs.tabsWrapper.$el.children[idx];
              const tabRefTop = tabRef.offsetTop;

              const containerTop = this.$refs.tabsWrapper.$el.offsetTop;
              const containerBottom = containerTop + this.$refs.tabsWrapper.$el.clientHeight;

              return tabRefTop >= containerBottom;
            })
            : [];
      },
      tabIsVisible(tab) {
        return !this.overflowTabs.map(t => t.id).includes(tab.id);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .tabs-wrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    height: 3rem !important;
    min-height: 3rem !important;
    overflow: hidden;
  }

  /deep/ .tab > button,
  .tab {
    max-width: calc(200px - 40px);
    height: 3rem !important;
    text-overflow: ellipsis;

    /* We *need* the overflow to be hidden for our calculations of which to show work properly.
     The default value clips the outline during keyboard navigation so this ensures it is fully
     visible without overlapping the actual content */
    outline-offset: -0.25em !important;
  }

  /deep/ .tab {
    display: inline-block;
    height: 3rem !important;
    margin: 0;
    overflow: visible; // Keep outline fully visible
  }

  .container {
    position: relative;
    height: 3rem !important;
  }

  .more-button {
    position: absolute;
    top: 5px;
    right: 0;
  }

</style>
