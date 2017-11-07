<template>

  <li>
    <router-link
      class="tab"
      :class="{ 'tab-has-icon-and-title': type === 'icon-and-title' }"
      :to="link"
    >

      <div v-if="type === 'icon' || type === 'icon-and-title'" class="tab-icon">
        <k-icon :ariaLabel="title">
          <!--SVG icon-->
          <slot></slot>
        </k-icon>
      </div>

      <div v-if="type === 'title' || type === 'icon-and-title'" class="tab-title">
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import kIcon from 'kolibri.coreVue.components.kIcon';

  /**
   Links for use inside the kNavbar
   */
  export default {
    name: 'kNavbarLink',
    components: { kIcon },
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
        required: true,
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
