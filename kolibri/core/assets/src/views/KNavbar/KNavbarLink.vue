<template>

  <li class="list-item">
    <router-link
      class="tab"
      :class="$computedClass(tabStyles)"
      :to="link"
    >
      <div class="tab-icon">
        <UiIcon
          class="icon"
          tabindex="-1"
        >
          <!--The icon svg-->
          <slot></slot>
        </UiIcon>
      </div>

      <div class="tab-title" tabindex="-1">
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import UiIcon from 'keen-ui/src/UiIcon';

  /**
   Links for use inside the KNavbar
   */
  export default {
    name: 'KNavbarLink',
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
      ...mapGetters(['$coreBgCanvas', '$coreActionDark', '$coreOutline']),
      tabStyles() {
        return {
          color: this.$coreBgCanvas,
          ':hover': {
            'background-color': this.$coreActionDark,
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
  }

  .router-link-active,
  .tab-selected {
    padding-bottom: 2px;
    color: white;
    border-bottom-color: white;
    border-bottom-style: solid;
    border-bottom-width: 2px;
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
