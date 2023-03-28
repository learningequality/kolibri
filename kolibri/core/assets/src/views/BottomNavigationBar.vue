<template>

  <div class="bottom-bar" :style="{ backgroundColor: $themeTokens.textInverted }">
    <span v-for="(routeDefinition, key) in bottomMenuOptions[0].routes" :key="key">
      <a
        :href="generateNavRoute(routeDefinition.route, bottomMenuOptions[0].url)"
        tabindex="-1"
        class="nav-menu-item"
        :style="{ textDecoration: 'none' }"
        @click="handleNav(routeDefinition.route)"
      >
        <div
          :style="isActiveLink(routeDefinition.route) ?
            bottomMenuActiveStyles :
            bottomMenuInactiveStyles"
        >
          <KIconButton
            :icon="routeDefinition.icon"
            :color="$themeTokens.primary"
            :ariaLabel="routeDefinition.label"
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
    <span class="nav-menu-item" :style="bottomMenuInactiveStyles">
      <KIconButton
        icon="menu"
        :ariaLabel="coreString('menuLabel')"
        :color="$themeTokens.primary"
        @click="$emit('toggleNav')"
      />
      <p :style="{ color: $themeTokens.primary }">{{ coreString('menuLabel') }}</p>
    </span>
  </div>

</template>


<script>

  import commonCoreStrings from '../mixins/commonCoreStrings';
  import { generateNavRoute } from '../utils/generateNavRoutes';

  export default {
    name: 'BottomNavigationBar',
    mixins: [commonCoreStrings],
    props: {
      bottomMenuOptions: {
        type: Array,
        required: true,
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
    },
    methods: {
      generateNavRoute(route, url) {
        const params = this.$route.params;
        return generateNavRoute(url, route, params);
      },
      isActiveLink(route) {
        return (
          route.includes(this.$router.currentRoute.path) &&
          this.$router.currentRoute.name != 'PROFILE'
        );
      },
      handleNav(route) {
        if (this.isActiveLink(route)) {
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
  }

</style>
