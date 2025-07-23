<template>

  <div
    :style="cssVars"
    class="renderer-wrapper"
  >
    <KCircularLoader
      v-if="loading || !html"
      :delay="false"
      class="loader"
    />
    <SafeHTML
      v-else
      :html="html"
      :styleOverrides="{
        windowSizeClass: windowSizeClass,
      }"
      @expand-img="openLightbox"
    />
  </div>

</template>


<script>

  import ZipFile from 'kolibri-zip';
  import SafeHTML from 'kolibri-common/components/SafeHTML';
  import useContentViewer, { contentViewerProps } from 'kolibri/composables/useContentViewer';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { computed } from 'vue';

  export default {
    name: 'SafeHtml5RendererIndex',
    __usesContentViewerComposable: true,
    components: {
      SafeHTML,
    },
    setup(props, context) {
      const { windowIsSmall } = useKResponsiveWindow();
      const windowSizeClass = computed(() => {
        return windowIsSmall.value ? ' small-window' : '';
      });
      const { defaultFile, forceDurationBasedProgress, durationBasedProgress } = useContentViewer(
        props,
        context,
        { defaultDuration: 300 },
      );
      return {
        windowSizeClass,
        defaultFile,
        forceDurationBasedProgress,
        durationBasedProgress,
      };
    },
    props: contentViewerProps,
    data() {
      return {
        loading: true,
        html: null,
      };
    },
    computed: {
      entry() {
        return (this.options && this.options.entry) || 'index.html';
      },
      scrollBasedProgress() {
        return 0.5;
      },
      cssVars() {
        return {
          '--color-primary-500': this.$themeBrand.primary.v_500,
          '--color-primary-100': this.$themeBrand.primary.v_100,
          '--color-grey-300': this.$themePalette.grey.v_300,
          '--color-grey-100': this.$themePalette.grey.v_100,
          '--color-fineline': this.$themeTokens.fineLine,
        };
      },
    },
    async created() {
      const storageUrl = this.defaultFile.storage_url;
      const zipFile = new ZipFile(storageUrl);
      const entryHtmlFile = await zipFile.file(this.entry);
      this.html = entryHtmlFile.toString();
      this.loading = false;
      this.$emit('startTracking');
      this.pollProgress();
    },
    mounted() {
      this.$nextTick(() => {
        this.applyTabIndexes();
        window.addEventListener('resize', this.applyTabIndexes);
      });
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      window.removeEventListener('resize', this.applyTabIndexes);
      this.$emit('stopTracking');
    },
    methods: {
      applyTabIndexes() {
        const tableContainers = this.$el.querySelectorAll('.table-container');
        tableContainers.forEach(container => {
          const scrollable = container.scrollWidth > container.clientWidth;
          if (scrollable) {
            container.setAttribute('tabindex', '0');
          } else {
            container.removeAttribute('tabindex');
          }
        });
      },
      recordProgress() {
        let progress;
        if (this.forceDurationBasedProgress) {
          progress = this.durationBasedProgress;
        } else {
          // TODO: Handle progress tracking based on how
          // much of the article has been scrolled through
          progress = this.scrollBasedProgress;
        }
        this.$emit('updateProgress', progress);
        if (progress >= 1) {
          this.$emit('finished');
        }
        this.pollProgress();
      },
      pollProgress() {
        this.timeout = setTimeout(() => {
          this.recordProgress();
        }, 5000);
      },
      openLightbox(/* payload */) {
        // TODO: Implement lightbox when ready
        // payload contains: { src, alt }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

  .renderer-wrapper > div.safe-html {
    max-height: 100%;
    padding: 40px 16px;
    overflow-y: auto;
  }

</style>
