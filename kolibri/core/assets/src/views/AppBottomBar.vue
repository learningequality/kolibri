<template>

  <div>
    <AndroidNavigationNestedMenu
      v-if="navigationIsOpen"
      ref="sideNav"
      :navShown="navigationIsOpen"
      @close="navigationIsOpen = false"
      @toggleAndroidMenu="navigationIsOpen = !navigationIsOpen"
      @shouldFocusFirstEl="findFirstEl()"
    />

    <!-- Bottom Learn Components, which register themselves -->
    <component
      :is="component"
      v-for="component in learnPluginMenuNavigationOptions"
      :key="component.name"
      :mainDisplay="false"
      @toggleAndroidMenu="navigationIsOpen = !navigationIsOpen"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import { NavComponentSections } from 'kolibri.coreVue.vuex.constants';

  import AndroidNavigationNestedMenu from './AndroidNavigationNestedMenu.vue';

  export default {
    name: 'AppBottomBar',
    components: { AndroidNavigationNestedMenu },
    mixins: [commonCoreStrings],
    data() {
      return {
        navigationIsOpen: false,
      };
    },
    computed: {
      learnPluginMenuNavigationOptions() {
        return navComponents.filter(component => component.name === NavComponentSections.LEARN);
      },
    },
    watch: {
      navigationIsOpen(navigationIsOpen) {
        this.$nextTick(() => {
          if (navigationIsOpen) {
            this.findFirstEl();
          }
        });
      },
    },
    methods: {
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.sideNav.focusFirstEl();
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .bottom-bar {
    @extend %dropshadow-4dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 12;
    height: 48px;
    background-color: white;
  }

  .menu {
    z-index: 24;
    overflow-y: scroll;
    background-color: white;
    transition: background-color $core-time ease;
  }

  .icons {
    //  margin-top: 4px;
    display: flex;
    justify-content: space-around;
  }

  .icon-box {
    width: 48px;
  }

  .router-link-active {
    padding-top: 6px;
  }

  .button {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .label {
    padding: 0;
    margin-top: -8px;
    font-size: 12px;
  }

</style>
