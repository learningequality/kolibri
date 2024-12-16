<template>

  <header>
    <KToolbar
      :title="appBarTitle"
      :textColor="isFullscreen ? 'black' : 'white'"
      type="clear"
      :showIcon="showIcon"
      :style="{
        height: topBarHeight + 'px',
        backgroundColor: isFullscreen ? $themeTokens.appBar : $themePalette.black,
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
      <template #actions>
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
          ? this.$themeBrand.secondary.v_600
          : this.$themePalette.grey.v_700;
        const defaultBg = this.isFullscreen ? this.$themeTokens.appBar : this.$themePalette.black;
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

  /deep/ .ui-toolbar__left {
    margin-left: 5px;
    overflow: hidden;
  }

  /deep/ .ui-toolbar__nav-icon {
    margin-left: 0;
  }

  /deep/ .ui-toolbar__title {
    text-overflow: ellipsis;
  }

</style>
