<template>

  <UiToolbar
    :title="appBarTitle"
    textColor="white"
    type="clear"
    :showIcon="showIcon"
    :style="{
      height: height + 'px',
      backgroundColor: isFullscreen ? $themeTokens.appBar : $themeTokens.appBarFullscreen,
    }"
    @nav-icon-click="$emit('navIconClick')"
  >
    <router-link
      v-if="hasRoute"
      slot="icon"
      :to="route"
      class="link"
      :class="$computedClass(linkStyle)"
    >
      <!-- TODO add aria label? -->
      <UiIconButton
        type="flat"
        class="icon"
        :style="{ fill: $themeTokens.textInverted }"
        tabindex="-1"
      >
        <KIcon
          v-if="icon === 'close'"
          icon="close"
          :style="{ fill: $themeTokens.textInverted, top: 0, height: '24px', width: '24px', }"
        />
        <KIcon
          v-else-if="icon === 'arrow_back' && !isRtl"
          :style="{ fill: $themeTokens.textInverted, top: 0, height: '24px', width: '24px', }"
          icon="back"
        />
        <KIcon
          v-else-if="icon === 'arrow_back' && isRtl"
          :style="{ fill: $themeTokens.textInverted, top: 0, height: '24px', width: '24px', }"
          icon="forward"
        />
      </UiIconButton>
    </router-link>

    <UiIconButton
      v-else
      type="flat"
      class="icon"
      :style="{ fill: $themeTokens.textInverted }"
      @click="$emit('navIconClick')"
    >
      <KIcon
        v-if="icon === 'close'"
        icon="close"
        :style="{ fill: $themeTokens.textInverted, top: 0, height: '24px', width: '24px', }"
      />
      <KIcon
        v-if="icon === 'arrow_back' && !isRtl"
        icon="back"
        :style="{ fill: $themeTokens.textInverted, top: 0, height: '24px', width: '24px', }"
      />
      <KIcon
        v-if="icon === 'arrow_back' && isRtl"
        icon="forward"
        :style="{ fill: $themeTokens.textInverted, top: 0, height: '24px', width: '24px', }"
      />
    </UiIconButton>
  </UiToolbar>

</template>


<script>

  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';
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
      isFullscreen: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      hasRoute() {
        return Boolean(this.route);
      },
      linkStyle() {
        const hoverBg = this.isFullscreen
          ? this.$themeTokens.appBarDark
          : this.$themeTokens.appBarFullscreenDark;
        const defaultBg = this.isFullscreen
          ? this.$themeTokens.appBar
          : this.$themeTokens.appBarFullscreen;
        return {
          backgroundColor: defaultBg,
          ':hover': {
            backgroundColor: hoverBg,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  // only used when using a link. Otherwise, uses UiToolbar's styles
  .icon {
    // copied from keen
    width: 3em;
    height: 3em;
  }

  .link {
    display: inline-block;
    border-radius: 50%;
    outline-offset: -4px;
  }

</style>
