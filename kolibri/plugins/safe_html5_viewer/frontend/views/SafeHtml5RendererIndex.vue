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
      <SafeHTML :html="html" />
    </div>
  </div>

</template>


<script>

  import ZipFile from 'kolibri-zip';
  import SafeHTML from 'kolibri-common/components/SafeHTML';
  import debounce from 'lodash/debounce';
  import useContentViewer, { contentViewerProps } from 'kolibri/composables/useContentViewer';

  export default {
    name: 'SafeHtml5RendererIndex',
    components: {
      SafeHTML,
    },
    setup(props, context) {
      const { defaultFile, forceDurationBasedProgress, durationBasedProgress } = useContentViewer(
        props,
        context,
        { defaultDuration: 300 },
      );
      return {
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
        debouncedHandleScroll: null,
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

      this.$emit('startTracking');
      this.pollProgress();
    },
    mounted() {
      this.safeHtmlDomReadyHandler();
      this.$watch('loading', this.safeHtmlDomReadyHandler);
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      const wrapper = this.$refs.safeHtmlWrapper;
      if (wrapper && this.debouncedHandleScroll) {
        wrapper.removeEventListener('scroll', this.debouncedHandleScroll);
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
      handleScroll() {
        const element = this.$refs.safeHtmlWrapper;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;

        // Calculate progress as a value between 0 and 1
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
          // Adds correction threshold to account for scroll-based progress inaccuracies
          const effectiveScrollTop = scrollTop + 1 >= maxScroll ? maxScroll : scrollTop;
          this.scrollBasedProgress = Math.min(effectiveScrollTop / maxScroll, 1);
        } else {
          // Content doesn't overflow, consider it fully read
          this.scrollBasedProgress = 1;
        }

        // Immediately record progress after updating scroll position
        this.recordProgress();
      },
      setupScrollListener() {
        // Only set up scroll listener if we're using scroll-based progress
        if (!this.forceDurationBasedProgress) {
          const wrapper = this.$refs.safeHtmlWrapper;
          if (wrapper) {
            this.debouncedHandleScroll = debounce(this.handleScroll, 150);
            wrapper.addEventListener('scroll', this.debouncedHandleScroll);
          }
        }
      },
      async safeHtmlDomReadyHandler() {
        if (!this.loading) {
          await this.$nextTick();
          this.applyTabIndexes();
          window.addEventListener('resize', this.applyTabIndexes);
          this.setupScrollListener();
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
