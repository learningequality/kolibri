<template>

  <UiToolbar
    :title="appBarTitle"
    textColor="white"
    type="colored"
    :showIcon="showIcon"
    :style="toolbarStyle"
    @nav-icon-click="$emit('navIconClick')"
  >
    <router-link
      v-if="hasRoute"
      slot="icon"
      :to="route"
      :class="['link', $computedClass(linkStyle)]"
    >
      <!-- TODO add aria label? -->
      <UiIconButton
        type="flat"
        class="icon"
        @click="$emit('navIconClick')"
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
      </UiIconButton>
    </router-link>

    <UiIconButton
      v-else
      type="flat"
      class="icon"
      @click="$emit('navIconClick')"
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
    </UiIconButton>
  </UiToolbar>

</template>


<script>

  import { mapGetters } from 'vuex';
  import UiToolbar from 'keen-ui/src/UiToolbar';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import { darken } from 'kolibri.utils.colour';
  import { validateLinkObject } from 'kolibri.utils.validators';

  export default {
    name: 'ImmersiveToolbar',
    components: {
      UiToolbar,
      UiIconButton,
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
      ...mapGetters([
        '$coreGrey200',
        '$coreGrey300',
        '$coreOutline',
        '$coreActionDark',
        '$coreActionNormal',
        '$coreTextDefault',
      ]),
      hasRoute() {
        return Boolean(this.route);
      },
      toolbarStyle() {
        const style = {
          height: this.height + 'px',
          backgroundColor: this.primary ? this.$coreActionNormal : $coreTextDefault,
        };
        return style;
      },
      linkStyle() {
        const hoverAndFocus = {
          backgroundColor: this.primary ? this.$coreActionDark : darken(this.$coreTextDefault, 0.1),
        };
        return {
          backgroundColor: this.primary ? '' : this.$coreTextDefault,
          ':hover': hoverAndFocus,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  // only used when using a link. Otherwise, uses UiToolbar's styles
  .icon {
    width: 3em;
    // copied from keen
    height: 3em;
    fill: white;
  }

  .link {
    display: inline-block;
    border-radius: 50%;
  }



</style>
