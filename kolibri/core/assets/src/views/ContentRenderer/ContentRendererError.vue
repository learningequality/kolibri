<template>

  <div class="container">
    <UiAlert :dismissible="false" class="alert" type="error">
      <span>{{ $tr('rendererNotAvailable') }}</span><br>
      <KButton
        v-if="error && error.message"
        appearance="basic-link"
        :text="appErrorTranslator.$tr('defaultErrorReportPrompt')"
        @click="showDetailsModal = true"
      />
      <DownloadButton
        class="download-button"
        :files="files"
      />
    </UiAlert>
    <ReportErrorModal
      v-if="error && error.message && showDetailsModal"
      :error="error.message"
      @cancel="showDetailsModal = false"
    />
  </div>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import AppError from 'kolibri-common/components/AppError';
  import ReportErrorModal from 'kolibri-common/components/AppError/ReportErrorModal';
  import DownloadButton from './DownloadButton';

  export default {
    name: 'ContentRendererError',
    components: {
      DownloadButton,
      ReportErrorModal,
      UiAlert,
    },
    props: {
      error: {
        type: Object,
        default: null,
      },
      files: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        showDetailsModal: false,
      };
    },
    created() {
      this.appErrorTranslator = crossComponentTranslator(AppError);
    },
    $trs: {
      rendererNotAvailable: {
        message: 'Kolibri is unable to render this resource',
        context:
          'This message is displayed when Kolibri is unable to properly load or display the requested resource (could be either server loading error, or something wrong with the resource format itself).',
      },
    },
  };

</script>


<style scoped>
  .container {
    background: rgba(0, 0, 0, 0.7);
    height: 100%;
    width: 100%;
  }

  .download-button {
    float: right;
  }

  .alert {
    margin: 8px;
    text-align: left;
    width: calc(100% - 16px);
    background: white;
  }
</style>
