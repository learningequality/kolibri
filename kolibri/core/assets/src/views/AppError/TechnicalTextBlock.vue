<template>

  <div>
    <!-- visible text area, hidden to screenreaders -->
    <textarea
      v-model="text"
      readonly
      class="error-log"
      wrap="soft"
      aria-hidden="true"
      :style="dynamicHeightStyle"
    >
    </textarea>
    <!-- invisible text block for copying, visible to screenreaders -->
    <pre class="visuallyhidden" ref="textBox">{{ text }}</pre>
    <div>
      <KButton
        v-if="clipboardCapable"
        class="copy-to-clipboard-button"
        :primary="false"
        :text="$tr('copyToClipboardButtonPrompt')"
        ref="copyButton"
      />
    </div>
    <div>
      <KExternalLink
        :text="$tr('downloadAsTextPrompt')"
        :download="downloadFileName"
        :href="textFileLink"
      />
    </div>
  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import ClipboardJS from 'clipboard';

  export default {
    name: 'TechnicalTextBlock',
    $trs: {
      copyToClipboardButtonPrompt: 'Copy to clipboard',
      copiedToClipboardConfirmation: 'Copied to clipboard',
      downloadAsTextPrompt: 'Or download as a text file',
    },
    components: {
      KButton,
      KExternalLink,
    },
    props: {
      text: {
        type: String,
        default: '',
      },
      maxHeight: {
        type: Number,
        required: false,
      },
      minHeight: {
        type: Number,
        default: 72,
      },
      downloadFileName: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      clipboardCapable() {
        return ClipboardJS.isSupported();
      },
      textFileLink() {
        const windowsFormattedText = this.text.replace('\n', '\r\n');
        const errorBlob = new Blob([windowsFormattedText], { type: 'text/plain', endings: 'native' });
        if (navigator.msSaveBlob) {
          return navigator.msSaveBlob(errorBlob, this.downloadFileName);
        }
        return URL.createObjectURL(errorBlob);
      },
      dynamicHeightStyle() {
        return {
          height: `${16 + this.text.split('\n').length * 18}px`,
          maxHeight: `${this.maxHeight}px`,
          minHeight: `${this.minHeight}px`,
        };
      },
    },
    mounted() {
      if (this.clipboardCapable) {
        this.clipboard = new ClipboardJS(this.$refs.copyButton.$el, {
          text: () => this.text,
          // needed because modal changes browser focus
          container: this.$refs.textBox,
        });

        this.clipboard.on('success', () => {
          this.createSnackbar({
            text: this.$tr('copiedToClipboardConfirmation'),
            autoDismiss: true,
          });
        });
      }
    },
    destroyed() {
      if (this.clipboard) {
        this.clipboard.destroy();
      }
    },
    methods: {
      ...mapActions(['createSnackbar']),
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .error-log {
    width: 100%;
    padding: 8px;
    font-family: monospace;
    line-height: 18px;
    white-space: pre;
    resize: none;
    background-color: $core-bg-error;
    border: $core-grey-300;
    border-radius: $radius;
  }

  .copy-to-clipboard-button {
    margin-left: 0;
  }

  .download-as-text-link {
    word-wrap: break-word;
  }

  .hide {
    display: none;
  }

</style>
