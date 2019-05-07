<template>

  <div>
    <div
      class="banner"
      :style="{ background: $coreBgLight}"
      :tabindex="0"
      role="dialog"
    >
      <div class="banner-inner">

        <slot :bannerClosed="bannerClosed"></slot>

        <KButton
          v-if="!bannerClosed"
          class="close-button"
          :text="$tr('closeButton')"
          appearance="flat-button"
          :primary="true"
          @click="toggleBanner"
        />

        <KButton
          v-else
          class="open-button"
          :text="$tr('openButton')"
          appearance="flat-button"
          :primary="true"
          @click="toggleBanner"
        />

      </div>
    </div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KButton from 'kolibri.coreVue.components.KButton';

  export default {
    name: 'CoreBanner',
    components: { KButton },
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

  .banner {
    position: relative;
    top: 0%;
    left: 0%;
    z-index: 7500;
    width: 100%;
    margin: 0 auto;
    overflow-y: auto;
    box-shadow: 0 2px 50px rgba(0, 0, 0, 1);
  }

  .banner-inner {
    max-width: 1000px;
    padding-top: 0;
    padding-right: 12px;
    padding-left: 12px;
    margin: 0 auto;

    h1 {
      font-weight: bold;
    }
  }

  .close-button {
    float: right;
    margin-bottom: 24px;
  }

  .open-button {
    float: right;
    margin-top: 14px;
  }

</style>
