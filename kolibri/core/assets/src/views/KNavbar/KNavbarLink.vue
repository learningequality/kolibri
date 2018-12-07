<template>

  <li class="list-item">
    <router-link
      class="tab"
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
    color: $core-action-light;
    text-decoration: none;
    border: 0;
    border-radius: 0;
    &:hover,
    &:focus {
      background-color: $core-action-dark;
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
