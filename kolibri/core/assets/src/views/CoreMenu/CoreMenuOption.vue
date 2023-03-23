<template>

  <div>
    <li v-if="!subRoutes">
      <a
        ref="menuItem"
        :href="link"
        class="core-menu-option"
        role="menuitem"
        :class="$computedClass(optionStyle)"
        :tabindex="link ? false : '0'"
        @click="conditionalEmit"
        @keydown.enter="conditionalEmit"
      >
        <slot>
          <KLabeledIcon>
            <template v-if="icon" #icon>
              <KIcon :icon="icon" :color="optionIconColor" />
            </template>
            <div v-if="label">{{ label }}</div>
          </KLabeledIcon>
          <div v-if="secondaryText">{{ secondaryText }}</div>
        </slot>
      </a>
    </li>
    <!-- routes that have subpaths -->
    <li v-else>
      <a
        ref="menuItem"
        class="core-menu-option"
        role="menuitem"
        :class="$computedClass(optionStyle)"
        tabindex="0"
        @click="visibleSubMenu = !visibleSubMenu"
        @keydown.enter="visibleSubMenu = !visibleSubMenu"
      >
        <slot>
          <KLabeledIcon :iconAfter="iconAfter">
            <template v-if="icon" #icon>
              <KIcon :icon="icon" :color="optionIconColor" />
            </template>
            <div v-if="label">{{ label }}</div>
          </KLabeledIcon>
          <div v-if="secondaryText">{{ secondaryText }}</div>
        </slot>
      </a>
    </li>

    <div v-if="visibleSubMenu">
      <div v-for="(nestedObject, key) in subRoutes" :key="key">
        <div class="link-container">
          <a
            :href="nestedObject.route"
            class="link"
            :class="$computedClass(subpathStyles(nestedObject.route))"
            @click="handleNav(nestedObject.route)"
          >
            {{ nestedObject.text }}
          </a>
        </div>
      </div>
    </div>

  </div>

</template>


<script>

  export default {
    name: 'CoreMenuOption',
    props: {
      label: {
        type: String,
        required: false,
        default: '',
      },
      link: {
        type: String,
        default: null,
      },
      secondaryText: {
        type: String,
        default: null,
      },
      icon: {
        type: String,
        required: false,
        default: '',
      },
      subRoutes: {
        type: Object,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    computed: {
      isActive() {
        return window.location.pathname.includes(this.label.toLowerCase());
      },
      optionStyle() {
        if (this.isActive) {
          return {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
            margin: '8px',
            backgroundColor: this.$themeBrand.primary.v_50,
            ':hover': {
              backgroundColor: this.$themeBrand.primary.v_100,
            },
            ':focus': this.$coreOutline,
          };
        }
        return {
          color: this.$themeTokens.text,
          ':hover': {
            backgroundColor: this.$themeBrand.primary.v_50,
          },
          ':focus': this.$coreOutline,
        };
      },
      optionIconColor() {
        return this.active ? this.$themeTokens.primary : null;
      },
      iconAfter() {
        return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
      },
    },
    mounted() {
      this.submenuShouldBeOpen();
    },
    methods: {
      conditionalEmit() {
        if (!this.link) {
          this.$emit('select');
        }
      },
      isActiveLink(route) {
        return route.includes(this.$router.currentRoute.path);
      },
      submenuShouldBeOpen() {
        // which plugin are we currently in?
        if (this.subRoutes) {
          const key = Object.keys(this.subRoutes)[0];
          this.subRoutes[key].route == `${window.location.pathname + window.location.hash}`
            ? (this.visibleSubMenu = true)
            : (this.visibleSubMenu = false);
        }
        return false;
      },
      subpathStyles(route) {
        if (this.isActiveLink(route) && this.$router.currentRoute.name != 'PROFILE') {
          return {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
            textDecoration: 'none',
          };
        }
        return {
          color: this.$themeTokens.text,
          textDecoration: 'none',
          ':hover': {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
          },
          ':focus': this.$coreOutline,
        };
      },
      toggleAndroidMenu() {
        this.$emit('toggleAndroidMenu');
      },
      handleNav(route) {
        this.isActiveLink(route) ? this.toggleAndroidMenu() : null;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .core-menu-option {
    display: block;
    padding: 8px;
    margin: 4px 8px;
    font-size: 16px;
    text-decoration: none;
    border-radius: $radius;
    outline-offset: -1px; // override global styles
    transition: background-color $core-time ease;

    &:hover {
      outline-offset: -1px; // override global styles
    }
  }

  .link-container {
    height: 44px;
  }

  .link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    margin: 0 40px;
    font-size: 12px;
    text-decoration: none;
  }

  .nav-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
  }

  button {
    margin-top: -6px;
  }

  p {
    margin: 0;
    margin-top: -8px;
    font-size: 12px;
    text-align: center;
  }

</style>
