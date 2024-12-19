<template>

  <li class="list-item-navigation visible">
    <router-link
      class="tab"
      :class="$computedClass(tabStyles)"
      :style="windowIsSmall ? smallScreenOverrides : {}"
      :to="link"
      :activeClass="activeClasses"
    >
      <div class="dimmable tab-icon">
        <slot></slot>
      </div>

      <div
        class="dimmable tab-title"
        tabindex="-1"
        :title="title"
      >
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  import { validateLinkObject } from 'kolibri/utils/validators';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import themeConfig from 'kolibri/styles/themeConfig';

  /**
Links for use inside the Navbar
*/
  export default {
    name: 'NavbarLink',
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        themeConfig,
        windowIsSmall,
      };
    },
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
          color: this.themeConfig.appBar.textColor,
          ':hover': {
            'background-color': this.$themeBrand.secondary.v_600,
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
      activeClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({
          color: this.themeConfig.appBar.textColor,
        })}`;
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

  .router-link-active {
    font-weight: bold;
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

  div.dimmable.tab-title::before {
    display: block;
    height: 0;
    overflow: hidden;
    font-weight: bold;
    pointer-events: none;
    visibility: hidden;
    content: attr(title);
    user-select: none;
  }

</style>
