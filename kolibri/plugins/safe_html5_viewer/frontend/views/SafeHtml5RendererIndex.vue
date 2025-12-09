<template>

  <div
    data-testid="safe-html-renderer-container"
    :style="cssVars"
  >
    <KCircularLoader
      v-if="loading || !html"
      :delay="false"
      class="loader"
    />
    <div
      v-else
      ref="safeHtmlWrapper"
      data-testid="safe-html-wrapper"
      class="safe-html-wrapper"
      role="region"
      :aria-label="$tr('articleContent')"
    >
      <SafeHTML
        :html="html"
        :styleOverrides="{
          windowSizeClass: windowSizeClass,
        }"
      />
    </div>
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
    components: {
      SafeHTML,
    },
    setup(props, context) {
      const { windowIsSmall } = useKResponsiveWindow();
      const windowSizeClass = computed(() => {
        return windowIsSmall.value ? 'small-window' : '';
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
        scrollBasedProgress: 0,
      };
    },
    computed: {
      entry() {
        return (this.options && this.options.entry) || 'index.html';
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

      // Wait for DOM update after loading completes
      await this.$nextTick();
      this.setupScrollListener();

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

      const wrapper = this.$refs.safeHtmlWrapper;
      if (wrapper) {
        wrapper.removeEventListener('scroll', this.handleScroll);
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
          // Use scroll events to track progress
          progress = this.scrollBasedProgress;
        }
        this.$emit('updateProgress', progress);

        // Use more lenient threshold to account for scroll-based progress inaccuracies
        if (progress >= 0.99) {
          this.$emit('finished');
        }
        this.pollProgress();
      },
      pollProgress() {
        this.timeout = setTimeout(() => {
          this.recordProgress();
        }, 5000);
      },
      handleScroll() {
        const element = this.$refs.safeHtmlWrapper;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;

        // Calculate progress as a value between 0 and 1
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
          this.scrollBasedProgress = Math.min(scrollTop / maxScroll, 1);
        } else {
          // Content doesn't overflow, consider it fully read
          this.scrollBasedProgress = 1;
        }
      },
      setupScrollListener() {
        const wrapper = this.$refs.safeHtmlWrapper;
        if (wrapper) {
          wrapper.addEventListener('scroll', this.handleScroll);
        }
      },
    },
    $trs: {
      articleContent: 'Article content',
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

  .safe-html-wrapper {
    max-height: 100%;
    padding: 40px 16px;
    overflow-y: auto;
  }

</style>
