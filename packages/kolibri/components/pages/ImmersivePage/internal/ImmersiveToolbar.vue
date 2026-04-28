<template>

  <header>
    <KToolbar
      :title="appBarTitle"
      :style="{
        height: topBarHeight + 'px',
        backgroundColor: appBarBgColor
          ? appBarBgColor
          : isFullscreen
            ? $themeTokens.appBar
            : $themePalette.black,
        color: isFullscreen ? $themeTokens.text : $themeTokens.textInverted,
      }"
    >
      <template #leading-actions>
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
            :color="isFullscreen ? $themeTokens.text : $themeTokens.textInverted"
            tabindex="-1"
          />
          <KIconButton
            v-else
            icon="back"
            :ariaLabel="coreString('goBackAction')"
            :color="isFullscreen ? $themeTokens.text : $themeTokens.textInverted"
          />
        </router-link>

        <span v-else>
          <KIconButton
            v-if="icon === 'close'"
            :ariaLabel="coreString('closeAction')"
            icon="close"
            :color="isFullscreen ? $themeTokens.text : $themeTokens.textInverted"
            tabindex="-1"
            @click="$emit('navIconClick')"
          />
          <KIconButton
            v-else
            icon="back"
            :ariaLabel="coreString('goBackAction')"
            :color="isFullscreen ? $themeTokens.text : $themeTokens.textInverted"
            @click="$emit('navIconClick')"
          />
        </span>
      </template>
      <template #trailing-actions>
        <slot name="actions"></slot>
      </template>
    </KToolbar>
  </header>

</template>


<script>

  import KToolbar from 'kolibri-design-system/lib/KToolbar';
  import { validateLinkObject } from 'kolibri/utils/validators';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useNav from 'kolibri/composables/useNav';

  export default {
    name: 'ImmersiveToolbar',
    components: {
      KToolbar,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { topBarHeight } = useNav();
      return {
        topBarHeight,
      };
    },
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
      route: {
        type: Object,
        default: null,
        validator: validateLinkObject,
      },
      isFullscreen: {
        type: Boolean,
        default: false,
      },
      appBarBgColor: {
        type: String,
        required: false,
        default: '',
      },
      appBarHoverBgColor: {
        type: String,
        required: false,
        default: '',
      },
    },
    computed: {
      hasRoute() {
        return Boolean(this.route);
      },
      linkStyle() {
        const hoverBg = this.isFullscreen
          ? this.$themeBrand.secondary.v_600
          : this.$themePalette.grey.v_700;
        const defaultBg = this.isFullscreen ? this.$themeTokens.appBar : this.$themePalette.black;
        return {
          backgroundColor: this.appBarBgColor ? this.appBarBgColor : defaultBg,
          ':hover': {
            backgroundColor: this.appBarHoverBgColor ? this.appBarHoverBgColor : hoverBg,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  // only used when using a link. Otherwise, uses KToolbar's styles
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

  /deep/ .k-toolbar-left {
    margin-left: 5px;
    overflow: hidden;
  }

  /deep/ .k-toolbar-leading-actions {
    margin-left: 0;
  }

</style>
