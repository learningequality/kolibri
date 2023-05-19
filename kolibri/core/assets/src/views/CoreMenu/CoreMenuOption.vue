<template>

  <div>
    <!-- routes that have subpaths -->
    <li v-if="subRoutes && subRoutes.length > 0">
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
    <li v-else>
      <a
        ref="menuItem"
        :href="link"
        class="core-menu-option"
        role="menuitem"
        :class="$computedClass(optionStyle)"
        tabindex="0"
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

    <div v-if="visibleSubMenu">
      <div v-for="subRoute in subRoutes" :key="subRoute.label">
        <div class="link-container">
          <a
            :href="generateNavRoute(subRoute.route)"
            class="link"
            :class="$computedClass(subpathStyles(subRoute.route))"
            @click="handleNav(subRoute.route)"
          >
            {{ subRoute.label }}
          </a>
        </div>
      </div>
    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { generateNavRoute } from '../../utils/generateNavRoutes';

  export default {
    name: 'CoreMenuOption',
    mixins: [commonCoreStrings],
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
        type: Array,
        required: false,
        default: null,
      },
      disabled: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    computed: {
      isActive() {
        return window.location.pathname == this.link;
      },
      optionStyle() {
        if (this.disabled) {
          return {
            color: this.$themeTokens.textDisabled,
            margin: '8px',
          };
        }
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
        if (this.disabled) {
          return this.$themeTokens.textDisabled;
        } else if (this.active) {
          return this.$themeTokens.primary;
        } else {
          return null;
        }
      },
      iconAfter() {
        return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
      },
    },
    mounted() {
      this.submenuShouldBeOpen();
    },
    methods: {
      isActiveLink(route) {
        const hash = window.location.hash;
        return (
          this.standarizeSubPathRoutes('#' + route) === `${hash}` ||
          hash.includes(this.checkClassIdInString(route))
        );
      },
      submenuShouldBeOpen() {
        if (this.subRoutes && this.subRoutes.length > 0) {
          window.location.pathname === this.link
            ? (this.visibleSubMenu = true)
            : (this.visibleSubMenu = false);
        }
        return false;
      },
      subpathStyles(route) {
        if (this.isActiveLink(route)) {
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
        if (this.disabled) {
          return;
        }
        this.$emit('toggleAndroidMenu');
      },
      handleNav(route) {
        this.isActiveLink(route) ? this.toggleAndroidMenu() : null;
      },
      generateNavRoute(route) {
        const params = this.$route.params;
        return generateNavRoute(this.link, route, params);
      },
      conditionalEmit() {
        if (this.disabled || this.link) {
          return;
        }
        this.$emit('select');
      },
      standarizeSubPathRoutes(link) {
        var subRoutePath = link.replace(/\/:[^/]*\??/, '');
        return subRoutePath;
      },

      // changes urls that contain IDs
      // to match with the actual url route in the browser
      checkClassIdInString(str) {
        const classId = 'classId';
        const regex = new RegExp(`\\b${classId}\\b`, 'i');
        if (regex.test(str)) {
          return str.replace('/:classId', '');
        }
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
    font-size: 14px;
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

</style>
