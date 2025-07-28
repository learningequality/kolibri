<template>

  <div>
    <KCircularLoader
      v-if="loading || !html"
      :delay="false"
      class="loader"
    />
    <SafeHTML
      v-else
      :html="html"
    />
  </div>

</template>


<script>

  import ZipFile from 'kolibri-zip';
  import SafeHTML from 'kolibri-common/components/SafeHTML';

  export default {
    name: 'SafeHtml5RendererIndex',
    components: {
      SafeHTML,
    },
    data() {
      return {
        loading: true,
        html: null,
      };
    },
    computed: {
      /**
       * @public
       * Note: the default duration historically for HTML5 Apps has been 5 min
       */
      defaultDuration() {
        return 300;
      },
      entry() {
        return (this.options && this.options.entry) || 'index.html';
      },
      scrollBasedProgress() {
        return 0.5;
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
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');
    },
    methods: {
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
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

  .content-renderer > div {
    padding: 40px 16px;
    background-color: white;
  }

</style>
