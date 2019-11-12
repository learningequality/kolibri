<template>

  <div class="skip-nav-link">
    <KButton
      ref="button"
      :style="linkStyles"
      appearance="basic-link"
      :text="$tr('skipToMainContentAction')"
      @click="handleClickSkipLink"
    />
  </div>

</template>


<script>

  export default {
    name: 'SkipNavigationLink',
    computed: {
      linkStyles() {
        return {
          backgroundColor: this.$themeTokens.surface,
        };
      },
    },
    methods: {
      handleClickSkipLink() {
        // Every page where this is supposed to work needs to have a top-level
        // element with 'role' and 'id' attribute equal to 'main' and 'tabindex= -1'.
        // If it doesn't have one, clicking this link is a noop, but will re-focus itself
        // as a convenience (in case main div is still loading).
        const mainEl = document.getElementById('main');
        if (mainEl) {
          // If it exists, actually target and focus on the main header
          const header = mainEl.querySelector('h1');
          if (header) {
            // HACK: Need to set its tabindex attribute on the fly to get tab behavior
            header.setAttribute('tabindex', -1);
            header.focus();
          } else {
            mainEl.focus();
          }
        } else {
          // NOTE: the button retains focus, but loses :focus styling after hitting "Enter"
          // TODO: look into theme input modality to see if we can get consistent
          // styling when in keyboard modality
          this.$refs.button.$el.focus();
        }
      },
    },
    $trs: {
      skipToMainContentAction: 'Skip to main content',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .skip-nav-link {
    position: relative;
    z-index: 2;
  }

  .skip-nav-link a {
    @extend %dropshadow-4dp;

    position: absolute;
    left: -1000px;
    padding: 8px 16px;
    font-size: 14px;
    background-color: white;
    outline-offset: 0 !important;

    &:focus {
      top: 8px;
      left: 8px;
    }
  }

</style>
