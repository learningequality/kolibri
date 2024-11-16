<template>

  <div>
    <!-- visible text area, hidden to screenreaders -->
    <textarea
      :value="text"
      readonly
      class="error-log"
      wrap="soft"
      aria-hidden="true"
      :style="[
        dynamicHeightStyle,
        {
          backgroundColor: $themePalette.grey.v_100,
          border: $themePalette.grey.v_400,
        },
      ]"
    >
    </textarea>
    <!-- invisible text block for copying, visible to screenreaders -->
    <pre
      ref="textBox"
      class="visuallyhidden"
    >{{ text }}</pre>
    <div>
      <KButton
        v-if="clipboardCapable"
        ref="copyButton"
        :style="{ marginTop: '8px', marginBottom: '8px' }"
        :primary="false"
        :text="$tr('copyToClipboardButtonPrompt')"
      />
    </div>
  </div>

</template>


<script>

  import useSnackbar from 'kolibri/composables/useSnackbar';
  import ClipboardJS from 'clipboard';

  export default {
    name: 'TechnicalTextBlock',
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    props: {
      text: {
        type: String,
        default: '',
      },
      maxHeight: {
        type: Number,
        default: null,
      },
      minHeight: {
        type: Number,
        default: 72,
      },
    },
    computed: {
      clipboardCapable() {
        return ClipboardJS.isSupported();
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
          this.createSnackbar(this.$tr('copiedToClipboardConfirmation'));
        });
      }
    },
    destroyed() {
      if (this.clipboard) {
        this.clipboard.destroy();
      }
    },
    $trs: {
      copyToClipboardButtonPrompt: {
        message: 'Copy to clipboard',
        context:
          'Button which allows the user to copy content to the clipboard.\n\nA clipboard is a temporary storage area where material cut or copied from a file is kept for pasting into another file.',
      },
      copiedToClipboardConfirmation: {
        message: 'Copied to clipboard',
        context:
          'Message displayed when some content is copied to the clipboard.\n\nA clipboard is a temporary storage area where material cut or copied from a file is kept for pasting into another file.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .error-log {
    width: 100%;
    padding: 8px;
    font-family: monospace;
    line-height: 18px;
    white-space: pre;
    resize: none;
    border-radius: $radius;
  }

</style>
