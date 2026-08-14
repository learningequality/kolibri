<template>

  <div data-testid="safe-html-renderer-container">
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
        @startTracking="handleViewerStartTracking"
        @stopTracking="handleViewerStopTracking"
        @updateProgress="handleViewerUpdateProgress"
        @addProgress="handleViewerAddProgress"
        @finished="handleViewerFinished"
      />
    </div>
  </div>

</template>


<script>

  import ZipFile from 'kolibri-zip';
  import { createSafeHTML } from 'kolibri-common/components/SafeHTML';
  import debounce from 'lodash/debounce';
  import useContentViewer from 'kolibri/composables/useContentViewer';
  import urls from 'kolibri/urls';

  const SafeHTML = createSafeHTML({}, { allowedOrigins: [urls.zipContentOrigin()] });

  export default {
    name: 'SafeHtml5RendererIndex',
    components: {
      SafeHTML,
    },
    setup(props, context) {
      const { defaultFile, options, forceDurationBasedProgress, durationBasedProgress } =
        useContentViewer(context, { defaultDuration: 300 });
      return {
        defaultFile,
        options,
        forceDurationBasedProgress,
        durationBasedProgress,
      };
    },
    data() {
      return {
        loading: true,
        html: null,
        scrollBasedProgress: 0,
        debouncedHandleScroll: null,
        // Track embedded viewers for progress aggregation
        // Using object instead of Map for Vue 2.7 reactivity
        // Structure: { viewerId: { progress: number } }
        embeddedViewers: {},
        // Guard to prevent emitting 'finished' multiple times
        hasEmittedFinished: false,
      };
    },
    computed: {
      entry() {
        return (this.options && this.options.entry) || 'index.html';
      },
      // Count of registered embedded viewers
      viewerCount() {
        return Object.keys(this.embeddedViewers).length;
      },
      // Aggregated progress using dynamic weighting
      // If no embedded viewers: progress = scrollBasedProgress
      // If viewers exist: progress = (scrollBasedProgress + avgViewerProgress) / 2
      aggregatedProgress() {
        if (this.viewerCount === 0) {
          return this.scrollBasedProgress;
        }

        let totalViewerProgress = 0;
        for (const viewer of Object.values(this.embeddedViewers)) {
          totalViewerProgress += viewer.progress;
        }
        const avgViewerProgress = totalViewerProgress / this.viewerCount;

        // Dynamic weighting: 50% scroll, 50% viewers
        // A live average, so a viewer registering mid-session lowers it; the backend
        // keeps the maximum, so learner-facing progress never regresses.
        return (this.scrollBasedProgress + avgViewerProgress) / 2;
      },
    },
    async created() {
      const storageUrl = this.defaultFile.storage_url;
      const zipFile = new ZipFile(storageUrl, {
        largeFileUrlGenerator: filepath => urls.zipContentUrl(this.defaultFile, filepath),
      });
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

      this.$emit('stopTracking');
    },
    methods: {
      // Handle startTracking from embedded viewers
      handleViewerStartTracking(viewerId) {
        if (viewerId && !this.embeddedViewers[viewerId]) {
          this.$set(this.embeddedViewers, viewerId, { progress: 0 });
        }
      },

      // Handle stopTracking from embedded viewers
      handleViewerStopTracking(viewerId) {
        if (viewerId) {
          this.$delete(this.embeddedViewers, viewerId);
        }
      },

      // Handle updateProgress from embedded viewers
      handleViewerUpdateProgress(progress, viewerId) {
        if (viewerId && this.embeddedViewers[viewerId]) {
          this.$set(this.embeddedViewers, viewerId, {
            ...this.embeddedViewers[viewerId],
            progress: Math.min(1, Math.max(0, progress)),
          });
        }
      },

      // Handle addProgress from embedded viewers
      handleViewerAddProgress(delta, viewerId) {
        if (viewerId) {
          const viewer = this.embeddedViewers[viewerId];
          if (viewer) {
            const newProgress = Math.min(1, Math.max(0, viewer.progress + delta));
            this.$set(this.embeddedViewers, viewerId, {
              ...viewer,
              progress: newProgress,
            });
          }
        }
      },

      // Handle finished from embedded viewers
      handleViewerFinished(viewerId) {
        if (viewerId && this.embeddedViewers[viewerId]) {
          this.$set(this.embeddedViewers, viewerId, { progress: 1 });
        }
      },

      recordProgress() {
        let progress;
        if (this.forceDurationBasedProgress) {
          progress = this.durationBasedProgress;
        } else {
          // Use aggregated progress from scroll + embedded viewers
          progress = this.aggregatedProgress;
        }
        this.$emit('updateProgress', progress);
        // Scroll-to-bottom completes the article; embedded viewers
        // registered at that point must also be at 1.
        if (progress >= 1 && !this.hasEmittedFinished) {
          this.$emit('finished');
          this.hasEmittedFinished = true;
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
          // setupScrollListener needs $refs.safeHtmlWrapper to exist.
          await this.$nextTick();
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
