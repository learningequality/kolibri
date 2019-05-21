<template>

  <div
    class="banner"
    :style="{ background: $themeColors.white}"
  >
    <div class="banner-inner">
      <KGrid>
        <!-- Grid Content -->
        <KGridItem :sizes="bannerClosed ? [4, 6, 10] : [4, 8, 12]">
          <slot :bannerClosed="bannerClosed"></slot>
        </KGridItem>

        <!-- Grid Buttons -->
        <KGridItem
          v-if="bannerClosed"
          sizes="4, 2, 2"
          alignment="right"
        >
          <KButton
            class="open-button"
            :text="$tr('openButton')"
            appearance="flat-button"
            :primary="true"
            @click="toggleBanner"
          />
        </KGridItem>
        <KGridItem
          v-else
          size="100"
          percentage
          alignment="right"
        >
          <KButton
            class="close-button"
            :text="$tr('closeButton')"
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

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'CoreBanner',
    components: { KButton, KGrid, KGridItem },
    mixins: [themeMixin],
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
      closeButton: 'Close',
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
