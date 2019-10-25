<template>

  <li class="list-item">
    <router-link
      class="tab"
      :class="$computedClass(tabStyles)"
      :to="link"
    >
      <div class="tab-icon dimmable">
        <UiIcon
          class="icon"
          tabindex="-1"
        >
          <!--The icon svg-->
          <slot></slot>
        </UiIcon>
      </div>

      <div class="tab-title dimmable" tabindex="-1">
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import UiIcon from 'keen-ui/src/UiIcon';

  /**
   Links for use inside the Navbar
   */
  export default {
    name: 'NavbarLink',
    components: { UiIcon },
    props: {
      /**
       * The text
       */
      title: {
        type: String,
        required: false,
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
          color: this.$themePalette.grey.v_100,
          ':hover': {
            'background-color': this.$themeTokens.appBarDark,
          },
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: '-6px',
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .list-item {
    display: inline-block;
    text-align: center;
  }

  .tab {
    display: inline-block;
    min-width: 72px;
    max-width: 264px;
    padding: 0 18px;
    padding-bottom: 3px;
    margin: 0;
    font-size: 14px;
    text-decoration: none;
    border: 0;
    border-radius: 0;
    border-top-left-radius: $radius;
    border-top-right-radius: $radius;
    transition: background-color $core-time ease;
    .dimmable {
      opacity: 0.6;
    }
  }

  // Getting this class to work correctly with our theme system is not currently
  // possible. Some options:
  //  1. Update vueAphrodite to handle nested classes (to handle .dimmable)
  //  2. Wait for <router-link> to support scoped slots as described in
  //     https://github.com/vuejs/rfcs/pull/34
  //  3. Somehow refactor the tab styling to not require nested active classes
  .router-link-active {
    padding-bottom: 2px;
    color: white;
    border-bottom-color: white;
    border-bottom-style: solid;
    border-bottom-width: 2px;
    .dimmable {
      opacity: 1;
    }
  }

  .icon {
    font-size: 24px;
  }

  .tab-icon {
    display: inline-block;
    padding: 10px 0;
    margin-right: 4px;
  }

  .tab-title {
    display: inline-block;
    font-weight: bold;
    text-overflow: ellipsis;
    text-transform: uppercase;
    vertical-align: middle;
  }

</style>
