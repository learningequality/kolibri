<template>

  <KTabsList
    ref="tabsWrapper"
    class="tabs-wrapper"
    v-bind="$attrs"
    :tabs="tabs"
  >
    <template #tab="{ tab }">
      <slot name="tab" :tab="tab" :tabIsVisible="tabIsVisible(tab)"></slot>
    </template>
    <slot name="overflow" :overflowTabs="overflowTabs"></slot>
  </KTabsList>

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
      pxReservedForOverflowButton: {
        type: Number,
        default: 40,
      },
      tabs: {
        type: Array,
        required: true,
      },
    },
    data() {
      return { mounted: false };
    },
    computed: {
      overflowTabs() {
        return this.mounted && this.windowWidth
          ? this.tabs.filter((_, idx) => {
              const tabRef = this.$refs.tabsWrapper.$children[idx].$el;
              const tabRefTop = tabRef.offsetTop;

              const containerTop = this.$refs.tabsWrapper.$el.offsetTop;
              const containerBottom = containerTop + this.$refs.tabsWrapper.$el.clientHeight;

              return tabRefTop >= containerBottom;
            })
          : [];
      },
    },
    mounted() {
      this.mounted = true;
      this.$nextTick(() => {
        console.log(this.$slots);
        console.log(this.$refs);
      });
    },
    methods: {
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
    max-height: 40px;
    overflow: hidden;
  }

</style>
