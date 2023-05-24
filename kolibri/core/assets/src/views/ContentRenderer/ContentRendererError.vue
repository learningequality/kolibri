<template>

  <div>
    <UiAlert :dismissible="false" class="alert" type="error">
      <span>{{ $tr('rendererNotAvailable') }}</span><br>
      <KButton
        v-if="error && error.message"
        appearance="basic-link"
        :text="appErrorTranslator.$tr('defaultErrorReportPrompt')"
        @click="showDetailsModal = true"
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

  export default {
    name: 'ContentRendererError',
    components: {
      ReportErrorModal,
      UiAlert,
    },
    props: {
      error: {
        type: Object,
        default: null,
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
  .alert {
    margin-bottom: 0;
    text-align: left;
  }
</style>
