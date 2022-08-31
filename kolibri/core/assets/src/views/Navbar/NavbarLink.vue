<template>

  <li class="list-item-navigation visible">
    <router-link
      class="tab"
      :class="$computedClass(tabStyles)"
      :style="windowIsSmall ? smallScreenOverrides : {}"
      :to="link"
    >
      <div class="dimmable tab-icon">
        <slot></slot>
      </div>

      <div class="dimmable tab-title" tabindex="-1">
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  /**
   Links for use inside the Navbar
   */
  export default {
    name: 'NavbarLink',
    mixins: [responsiveWindowMixin],
    props: {
      /**
       * The text
       */
      title: {
        type: String,
        default: null,
      },
      /**
       * A router link object
       */
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
    },
    computed: {
      tabStyles() {
        return {
          color: this.$themePalette.grey.v_50,
          ':hover': {
            'background-color': this.$themeTokens.appBarDark,
          },
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: '-6px',
          },
        };
      },
      smallScreenOverrides() {
        return {
          padding: '0 8px',
          fontSize: '14px',
          borderBottomWidth: '2px',
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .list-item-navigation {
    display: inline-block;
    text-align: center;
    visibility: hidden;
  }

  .visible {
    visibility: visible;
  }

  .tab {
    display: inline-block;
    min-width: 72px;
    max-width: 264px;
    padding: 0 16px;
    padding-bottom: 6px;
    margin: 0;
    font-size: 14px;
    text-decoration: none;
    border: 0;
    border-radius: 0;
    border-top-left-radius: $radius;
    border-top-right-radius: $radius;
    transition: background-color $core-time ease;

    .dimmable {
      opacity: 1;
    }
  }

  // Getting this class to work correctly with our theme system is not currently
  // possible. Some options:
  //  1. Update vueAphrodite to handle nested classes (to handle .dimmable)
  //  2. Wait for <router-link> to support scoped slots as described in
  //     https://github.com/vuejs/rfcs/pull/34
  //  3. Somehow refactor the tab styling to not require nested active classes
  .router-link-active {
    font-weight: bold;
    color: white;
    border-bottom-color: white;
    border-bottom-style: solid;
    border-bottom-width: 4px;

    .dimmable {
      opacity: 1;
    }
  }

  .icon {
    top: 0;
  }

  svg {
    width: 14px;
    height: 14px;
  }

  .tab-icon {
    display: inline-block;
    padding: 10px 0;
    margin-right: 4px;
  }

  .tab-title {
    display: inline-block;
    text-overflow: ellipsis;
  }

</style>
