<template>

  <li class="list-item">
    <router-link
      :class="[ 'tab', $computedClass(tab) ]"
      :to="link"
    >
      <div class="tab-icon">
        <UiIcon
          :ariaLabel="title"
          class="icon"
        >
          <!--The icon svg-->
          <slot></slot>
        </UiIcon>
      </div>

      <div class="tab-title">
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
      ...mapGetters(['$coreActionLight', '$coreActionDark']),
      tab() {
        const hoverAndFocus = {
          'background-color': this.$coreActionDark,
        };
        return {
          color: this.$coreActionLight,
          ':hover': hoverAndFocus,
          ':focus': hoverAndFocus,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

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
    &:hover,
    &:focus {
      outline: none;
    }
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
    overflow-x: hidden;
    font-weight: bold;
    text-overflow: ellipsis;
    text-transform: uppercase;
    vertical-align: middle;
  }

</style>
