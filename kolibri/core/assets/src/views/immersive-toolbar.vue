<template>

  <ui-toolbar
    :title="appBarTitle"
    textColor="white"
    type="colored"
    :navIcon="icon"
    :showIcon="showIcon"
    @nav-icon-click="$emit('navIconClick')"
    :class="{ secondary: !primary }"
    :style="{ height: height + 'px' }"
  >
    <div v-if="hasRoute" slot="icon">
      <router-link :to="route">
        <!-- TODO add aria label? -->
        <ui-icon-button
          type="flat"
          @click="$emit('navIconClick')"
          :icon="icon"
          class="icon"
        />
      </router-link>

    </div>
  </ui-toolbar>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import { validateLinkObject } from 'kolibri.utils.validators';

  export default {
    name: 'immersiveToolbar',
    components: {
      uiToolbar,
      uiIconButton,
    },
    props: {
      appBarTitle: {
        type: String,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
      icon: {
        type: String,
        required: false,
        default: 'close',
      },
      showIcon: {
        type: Boolean,
        required: false,
        default: true,
      },
      route: {
        type: Object,
        required: false,
        validator: validateLinkObject,
      },
      primary: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
    computed: {
      hasRoute() {
        return !!this.route;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // only used when using a link. Otherwise, uses uiToolbar's styles
  .icon
    // copied from keen
    height: 3em
    width: 3em
    color: white

  .secondary
    background-color: $core-text-default

</style>
