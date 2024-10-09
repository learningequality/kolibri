<template>

  <div
    class="bottom-bar"
    :style="{ backgroundColor: $themeTokens.textInverted }"
  >
    <span
      v-for="(routeDefinition, key) in routes"
      :key="key"
    >
      <a
        :href="routeDefinition.href"
        tabindex="-1"
        class="nav-menu-item"
        :style="{ textDecoration: 'none' }"
        @click="handleNav(routeDefinition.route)"
      >
        <div
          :style="
            isActiveLink(routeDefinition.route) ? bottomMenuActiveStyles : bottomMenuInactiveStyles
          "
        >
          <KIconButton
            :icon="routeDefinition.icon"
            :color="
              isActiveLink(routeDefinition.route) ? $themeTokens.primary : $themeTokens.annotation
            "
            :ariaLabel="routeDefinition.label"
            size="small"
          />
        </div>
        <p
          v-if="isActiveLink(routeDefinition.route)"
          class="nav-menu-label"
          :style="{ color: $themeTokens.primary }"
        >
          {{ routeDefinition.label }}
        </p>
      </a>
    </span>
    <span
      class="nav-menu-item"
      :style="bottomMenuInactiveStyles"
    >
      <KIconButton
        icon="menu"
        :ariaLabel="coreString('menuLabel')"
        size="small"
        :color="navShown ? $themeTokens.primary : $themeTokens.annotation"
        @click="$emit('toggleNav')"
      />
      <p
        v-if="navShown"
        class="nav-menu-label"
        :style="{ color: $themeTokens.primary }"
      >
        {{ coreString('menuLabel') }}
      </p>
    </span>
  </div>

</template>


<script>

  import commonCoreStrings from '../mixins/commonCoreStrings';

  export default {
    name: 'BottomNavigationBar',
    mixins: [commonCoreStrings],
    props: {
      bottomMenuItem: {
        type: Object,
        required: true,
      },
      navShown: {
        type: Boolean,
        required: true,
        default: false,
      },
    },
    computed: {
      bottomMenuActiveStyles() {
        return {
          borderTop: `4px solid ${this.$themeTokens.primary}`,
        };
      },
      bottomMenuInactiveStyles() {
        return {
          borderTop: `4px solid ${this.$themeTokens.textInverted}`,
        };
      },
      routes() {
        return this.bottomMenuItem.routes || [];
      },
    },
    methods: {
      isActiveLink(route) {
        return this.bottomMenuItem.active && route == this.$router.currentRoute.path;
      },
      handleNav(route) {
        if (this.isActiveLink(route) && this.navShown) {
          this.$emit('toggleNav');
        }
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
    z-index: 20;
    display: flex;
    align-items: flex-start;
    justify-content: space-around;
    height: 50px;
  }

  .nav-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
    margin: 0;
  }

  .nav-menu-label {
    margin: 0;
    margin-top: -6px;
    font-size: 12px;
  }

</style>
