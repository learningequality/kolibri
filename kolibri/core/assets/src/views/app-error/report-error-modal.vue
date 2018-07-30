<template>

  <k-modal
    :title="$tr('reportErrorHeader')"
    :cancelText="$tr('closeErrorModalButtomPrompt')"
    class="error-detail-modal"
    size="large"
    @cancel="$emit('cancel')"
  >

    <section>
      <h3 v-if="offline">
        {{ $tr('forumPrompt') }}
      </h3>
      <p> {{ $tr('forumUseTips') }} </p>
      <p> {{ $tr('forumPostingTips') }} </p>
      <k-external-link
        class="download-as-text-link"
        :text="forumLink"
        :href="forumLink"
      />
    </section>

    <!-- only when offline -->
    <section v-if="offline">
      <h3> {{ $tr('emailPrompt') }} </h3>
      <p> {{ $tr('emailDescription') }} </p>
      <!-- email link goes here. TODO Probably not an href? -->
      <k-external-link
        :text="emailAddress"
        :href="emailAddressLink"
      />
    </section>

    <section>
      <h3>
        {{ $tr('errorDetailsHeader') }}
      </h3>
      <code ref="errorLog" class="error-log">
        {{ error }}
      </code>
    </section>


    <section class="error-copying-options">
      <div>
        <k-button
          v-if="clipboardCapable"
          class="copy-to-clipboard-button"
          :primary="false"
          :text="$tr('copyToClipboardButtonPrompt')"
          ref="errorCopyButton"
        />
      </div>
      <div>
        <k-external-link
          :text="$tr('downloadAsTextPrompt')"
          :download="errorTextFileName"
          :href="errorTextFileLink"
        />
      </div>
    </section>


  </k-modal>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kModal from 'kolibri.coreVue.components.kModal';
  import ClipboardJS from 'clipboard';

  export default {
    name: 'reportErrorModal',
    $trs: {
      reportErrorHeader: 'Report Error',
      forumPrompt: 'Visit the community forums',
      // reall long
      forumUseTips:
        'Search the community forum to see if others encountered similar issues. If unable to find anything, paste the error details below into a new forum post so we can rectify the error in a future version of Kolibri.',
      forumPostingTips:
        'Include a description of what you were trying to do and what you clicked on when the error appeared.',
      emailPrompt: 'Send an email to the developers',
      emailDescription:
        'Contact the support team with your error details and we’ll do our best to help.',
      errorDetailsHeader: 'Error details',
      copyToClipboardButtonPrompt: 'Copy to clipboard',
      copiedToClipboardConfirmation: 'Copied to clipboard',
      downloadAsTextPrompt: 'Or download as .txt file',
      closeErrorModalButtomPrompt: 'Close',
      errorFileDenotation: 'error',
    },
    components: {
      kButton,
      kExternalLink,
      kModal,
    },
    data() {
      return {
        // TODO Set offline variable via ping in mounted()?
        // Or via computed prop
        offline: false,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      clipboardCapable() {
        return ClipboardJS.isSupported();
      },
      forumLink() {
        return 'https://community.learningequality.org/c/support/kolibri';
      },
      emailAddress() {
        return 'info@learningequality.org';
      },
      emailAddressLink() {
        return `mailto:${this.emailAddress}`;
      },
      errorTextFileLink() {
        const errorBlob = new Blob([this.error], { type: 'text/plain' });
        if (navigator.msSaveBlob) {
          return navigator.msSaveBlob(errorBlob, this.errorTextFileName);
        }
        return URL.createObjectURL(errorBlob);
      },
      errorTextFileName() {
        const downloadTime = new Date();
        return `kolibri-${this.$tr('errorFileDenotation')}-${downloadTime.toISOString()}.txt`;
      },
    },
    mounted() {
      if (this.clipboardCapable) {
        this.clipboard = new ClipboardJS(this.$refs.errorCopyButton.$el, {
          text: () => this.error,
          // needed because modal changes browser focus
          container: this.$refs.errorLog,
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

  .error-detail-modal {
    text-align: left;
  }

  .error-log {
    display: block;
    padding: 8px;
    background-color: $core-bg-error;
    border: $core-grey-300;
  }

  .copy-to-clipboard-button {
    margin-left: 0;
  }

  .download-as-text-link {
    word-wrap: break-word;
  }

</style>
