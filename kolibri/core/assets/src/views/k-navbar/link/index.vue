<template>

  <li>
    <router-link
      class="tab"
      :class="{ 'tab-has-icon-and-title': type === 'icon-and-title' }"
      :to="link"
    >
      <div v-if="type === 'icon' || type === 'icon-and-title'" class="tab-icon">
        <ui-icon :ariaLabel="title" class="icon">
          <!--The icon svg-->
          <slot></slot>
        </ui-icon>
      </div>
      <div v-if="type === 'title' || type === 'icon-and-title'" class="tab-title">
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import uiIcon from 'keen-ui/src/UiIcon';

  /**
   Links for use inside the kNavbar
   */
  export default {
    name: 'kNavbarLink',
    components: { uiIcon },
    props: {
      /**
       * The type of tab. title, icon, or icon-and-title
       */
      type: {
        type: String,
        validator(type) {
          return ['title', 'icon', 'icon-and-title'].includes(type);
        },
        required: true,
      },
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


<style lang="stylus" scoped>

  @require '../items.styl'

</style>
