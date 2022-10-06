<template>

  <div>
    <div v-if="navigationIsOpen" class="menu">
      <AndroidNavigationNestedMenu />
    </div>
    <div class="bottom-bar">
      <div class="icons">
        <span
          v-for="(link, index) in navigationLinks"
          :key="index"
          class="icon-box"
          :activeClasses="activeClasses"
        >
          <router-link
            ref="btn"
            :to="link.link"
          >
            <KIconButton
              :icon="link.icon"
              :color="link.color"
              :ariaLabel="link.title"
            />

          </router-link>
          <p class="label" :style="{ color: $themeTokens.primary }">{{ link.title }}</p>

        </span>
        <KIconButton
          v-if="isAdmin || isCoach"
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
  import { mapGetters } from 'vuex';
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
      ...mapGetters(['isAdmin', 'isCoach']),
      activeClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({
          borderTop: this.$themeTokens.primary,
        })}`;
      },
    },
    methods: {
      toggleBottomNav() {
        this.navigationIsOpen = !this.navigationIsOpen;
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
    z-index: 24;
    height: 48px;
    background-color: white;
  }

  .menu {
    position: fixed;
    right: 0;
    bottom: 48px;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
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
