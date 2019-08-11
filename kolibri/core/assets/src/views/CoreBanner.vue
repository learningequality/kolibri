<template>

  <div
    class="banner"
    :style="{ background: $themeTokens.surface}"
  >
    <div class="banner-inner">
      <KGrid>
        <!-- Grid Content -->
        <KGridItem
          :layout8="{ span: bannerClosed ? 6 : 8 }"
          :layout12="{ span: bannerClosed ? 10 : 12 }"
        >
          <slot :bannerClosed="bannerClosed"></slot>
        </KGridItem>

        <!-- Grid Buttons -->
        <KGridItem
          v-if="bannerClosed"
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 2 }"
          :layout12="{ span: 2 }"
        >
          <KButton
            class="open-button"
            :text="$tr('openButton')"
            appearance="flat-button"
            :primary="true"
            @click="toggleBanner"
          />
        </KGridItem>
        <KGridItem v-else :layout="{ alignment: 'right' }">
          <KButton
            class="close-button"
            :text="coreString('closeAction')"
            appearance="flat-button"
            :primary="true"
            @click="toggleBanner"
          />
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'CoreBanner',
    mixins: [commonCoreStrings],
    data() {
      return {
        bannerClosed: false,
      };
    },
    methods: {
      toggleBanner() {
        this.bannerClosed = !this.bannerClosed;
      },
    },
    $trs: {
      openButton: 'More Info',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .banner {
    @extend %dropshadow-16dp;

    position: relative;
    width: 100%;
    margin: 0 auto;
  }

  .banner-inner {
    max-width: 1000px;
    padding-top: 0;
    padding-right: 16px;
    padding-left: 16px;
    margin: 0 auto;

    h1 {
      font-weight: bold;
    }
  }

  .close-button {
    margin-bottom: 24px;
  }

  .open-button {
    margin-top: 14px;
  }

</style>
