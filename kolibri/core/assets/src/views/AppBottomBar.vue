<template>

  <div>
    <AndroidNavigationNestedMenu
      v-if="navigationIsOpen"
      ref="sideNav"
      :navShown="navigationIsOpen"
      @toggleSideNav="navigationIsOpen = !navigationIsOpen"
      @shouldFocusFirstEl="findFirstEl()"
    />

    <div class="bottom-bar">
      <div class="icons">
        <span
          v-for="(link, index) in navigationLinks"
          :key="index"
          class="icon-box"
          :activeClasses="activeClasses"
        >
          <a :href="link.link">
            <KIconButton
              :icon="link.icon"
              :color="link.color"
              :ariaLabel="link.title"
            />
          </a>
          <p class="label" :style="{ color: $themeTokens.primary }">{{ link.title }}</p>
        </span>
        <KIconButton
          icon="menu"
          :color="$themeTokens.primary"
          :ariaLabel="$tr('openNav')"
          @click="toggleBottomNav"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AndroidNavigationNestedMenu from './AndroidNavigationNestedMenu';

  export default {
    name: 'AppBottomBar',
    components: { AndroidNavigationNestedMenu },
    mixins: [commonCoreStrings],
    props: {
      navigationLinks: {
        type: Array,
        default: () => [],
        required: true,
      },
    },
    data() {
      return {
        navigationIsOpen: false,
      };
    },
    computed: {
      activeClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({
          borderTop: this.$themeTokens.primary,
        })}`;
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
      toggleBottomNav() {
        this.navigationIsOpen = !this.navigationIsOpen;
      },
      findFirstEl() {
        this.$nextTick(() => {
          console.log(this.$refs);
          this.$refs.sideNav.focusFirstEl();
        });
      },
    },
    $trs: {
      openNav: {
        message: 'Open site navigation',
        context:
          "This message is providing additional context to the screen-reader users, but is not visible in the Kolibri UI.\n\nIn this case the screen-reader will announce the message when user navigates to the 'hamburger' button with the keyboard, to indicate that it allows them to open the sidebar navigation menu.",
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
