<template>

  <header>
    <UiToolbar
      :title="appBarTitle"
      textColor="white"
      type="clear"
      :showIcon="showIcon"
      :style="{
        height: topBarHeight + 'px',
        position: 'fixed',
        zIndex: 4,
        top: 0,
        right: 0,
        left: 0,
        backgroundColor: isFullscreen ? $themeTokens.appBar : $themeTokens.appBarFullscreen,
      }"
      @nav-icon-click="$emit('navIconClick')"
    >
      <template #icon>
        <router-link
          v-if="hasRoute"
          :to="route"
          class="link"
          :class="$computedClass(linkStyle)"
        >
          <!-- TODO add aria label? -->
          <KIconButton
            v-if="icon === 'close'"
            :ariaLabel="coreString('closeAction')"
            icon="close"
            :color="$themeTokens.textInverted"
            tabindex="-1"
          />
          <KIconButton
            v-else
            icon="back"
            :ariaLabel="coreString('goBackAction')"
            :color="$themeTokens.textInverted"
          />
        </router-link>

        <span v-else>
          <KIconButton
            v-if="icon === 'close'"
            :ariaLabel="coreString('closeAction')"
            icon="close"
            :color="$themeTokens.textInverted"
            tabindex="-1"
            @click="$emit('navIconClick')"
          />
          <KIconButton
            v-else
            icon="back"
            :ariaLabel="coreString('goBackAction')"
            :color="$themeTokens.textInverted"
            @click="$emit('navIconClick')"
          />
        </span>
      </template>
    </UiToolbar>
  </header>

</template>


<script>

  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponentsMixin from '../mixins/nav-components';

  export default {
    name: 'ImmersiveToolbar',
    components: {
      UiToolbar,
    },
    mixins: [commonCoreStrings, navComponentsMixin],
    props: {
      appBarTitle: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        required: false,
        default: 'close',
        validator(val) {
          return ['close', 'back'].includes(val);
        },
      },
      showIcon: {
        type: Boolean,
        required: false,
        default: true,
      },
      route: {
        type: Object,
        default: null,
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
