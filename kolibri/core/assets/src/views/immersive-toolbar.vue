<template>

  <ui-toolbar
    :title="appBarTitle"
    textColor="white"
    type="colored"
    :showIcon="showIcon"
    @nav-icon-click="$emit('navIconClick')"
    :class="{ secondary: !primary }"
    :style="{ height: height + 'px' }"
  >
    <router-link
      v-if="hasRoute"
      slot="icon"
      :to="route"
      class="link"
    >
      <!-- TODO add aria label? -->
      <ui-icon-button
        type="flat"
        @click="$emit('navIconClick')"
        class="icon"
      >
        <mat-svg
          v-if="icon === 'close'"
          name="close"
          category="navigation"
        />
        <mat-svg
          v-else-if="icon === 'arrow_back' && !isRtl"
          name="arrow_back"
          category="navigation"
        />
        <mat-svg
          v-else-if="icon === 'arrow_back' && isRtl"
          name="arrow_forward"
          category="navigation"
        />
      </ui-icon-button>
    </router-link>

    <ui-icon-button
      v-else
      type="flat"
      @click="$emit('navIconClick')"
      class="icon"
    >
      <mat-svg
        v-if="icon === 'close'"
        name="close"
        category="navigation"
      />
      <mat-svg
        v-if="icon === 'arrow_back' && !isRtl"
        name="arrow_back"
        category="navigation"
      />
      <mat-svg
        v-if="icon === 'arrow_back' && isRtl"
        name="arrow_forward"
        category="navigation"
      />
    </ui-icon-button>
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
        validator(val) {
          return ['close', 'arrow_back'].includes(val);
        },
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
        return Boolean(this.route);
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
    fill: white

  .secondary
    background-color: $core-text-default

  .link
    display: inline-block
    border-radius: 50%
    &:focus, &:hover
      background-color: $core-action-dark

  .secondary
    .link
      &:focus, &:hover
        background-color: darken($core-text-default, 25%)

</style>
