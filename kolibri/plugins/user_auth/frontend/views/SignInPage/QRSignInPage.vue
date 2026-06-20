<template>

  <AuthBase
    ref="authBaseRef"
    :busy="busy"
  >
    <template #header-leading-actions>
      <AuthContextHeading
        class="landscape-auth-context-heading"
        :useBackAction="hasMultipleFacilities"
        :backLabel="coreString('changeLearningFacility')"
        :backTo="backTo"
      />
    </template>

    <AuthContextHeading
      :useBackAction="hasMultipleFacilities"
      :backLabel="coreString('changeLearningFacility')"
      :backTo="backTo"
    />

    <div class="qr-page-body">
      <h2 class="scan-title">{{ scanQRCodeTitle$() }}</h2>
      <p
        class="scan-description"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ scanQRCodeDescription$() }}
      </p>

      <UiAlert
        v-if="wrongQRCode"
        class="error-alert"
        type="error"
        :dismissible="false"
      >
        {{ wrongQRCode$() }}
      </UiAlert>

      <QRScanner
        ref="scannerRef"
        @decoded="prevalidate"
      />
    </div>

    <QRSignInConfirmModal
      v-if="showConfirmModal"
      :learnerName="confirmedLearnerName"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </AuthBase>

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import useUser from 'kolibri/composables/useUser';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
  import { useRouter, useRoute } from 'vue-router/composables';
  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { useFacilitySelect } from 'kolibri-common/composables/useFacility';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import AuthBase from '../AuthBase';
  import useAuthFlow from '../../composables/useAuthFlow';
  import useAuthWatcher from '../../composables/useAuthWatcher';
  import useAuthRouter from '../../composables/useAuthRouter';
  import AuthContextHeading from '../AuthContextHeading.vue';
  import QRScanner from './QRSignIn/QRScanner.vue';
  import QRSignInConfirmModal from './QRSignIn/QRSignInConfirmModal.vue';

  export default {
    name: 'QRSignInPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AuthBase,
      AuthContextHeading,
      QRScanner,
      QRSignInConfirmModal,
      UiAlert,
    },
    mixins: [commonCoreStrings],
    setup() {
      const router = useRouter();
      const route = useRoute();
      const { login } = useUser();
      const { createSnackbar } = useSnackbar();
      const {
        scanQRCodeTitle$,
        scanQRCodeDescription$,
        wrongQRCode$,
      } = qrLoginStrings;
      const { nextParam, defaultRoute, getFacilitySelectionRoute } = useAuthRouter(route);
      const {
        hasMultipleFacilities,
        facilityId,
        signInOptions,
      } = useAuthFlow();
      const { watchForFacilityChange, watchForFacilityConfigChange } = useAuthWatcher();
      const { setSelectedFacilityId } = useFacilitySelect();

      const busy = ref(false);
      const showConfirmModal = ref(false);
      const confirmedLearnerName = ref('');
      const submittedToken = ref('');
      const wrongQRCode = ref(false);

      // Template refs for calling public methods on child components.
      const authBaseRef = ref(null);
      const scannerRef = ref(null);
      const backTo = computed(() => {
        return hasMultipleFacilities.value ? getFacilitySelectionRoute(false) : null;
      });

      watchForFacilityChange((newFacilityId, oldFacilityId) => {
        if (
          (!newFacilityId && oldFacilityId) ||
          !signInOptions.value.includes(OptionsForSignIn.QR_LOGIN)
        ) {
          router.push(defaultRoute.value);
        }
      });

      watchForFacilityConfigChange(() => {
        if (!signInOptions.value.includes(OptionsForSignIn.QR_LOGIN)) {
          router.push(defaultRoute.value);
        }
      });

      // Start the camera (or initialise the upload fallback) when the page mounts.
      onMounted(() => {
        // Wait a tick so the QRScanner's template ref is populated.
        if (scannerRef.value && scannerRef.value.start) {
          scannerRef.value.start();
        }
      });

      /**
       * Pre-validates the scanned QR token by calling login() with prevalidate=true,
       * which returns { full_name } without creating a session. On success we show
       * the confirm modal so the learner can verify their identity.
       *
       * @param {string} qrLoginToken
       * @return {Promise<void>}
       */
      async function prevalidate(qrLoginToken) {
        if (busy.value) return; // ignore scans already in flight
        busy.value = true;
        wrongQRCode.value = false;
        setSelectedFacilityId(facilityId.value);
        // Stop scanning while we validate so we don't fire duplicate events.
        if (scannerRef.value && scannerRef.value.stop) {
          scannerRef.value.stop();
        }
        try {
          const { data, error } = await login(
            { qr_login_token: qrLoginToken, facility: facilityId.value },
            true,
            false,
          );
          if (data) {
            submittedToken.value = qrLoginToken;
            confirmedLearnerName.value = data.full_name;
            showConfirmModal.value = true;
          } else if (error) {
            await authBaseRef.value.shake();
            wrongQRCode.value = true;
            // Resume scanning for retry.
            if (scannerRef.value && scannerRef.value.start) {
              scannerRef.value.start();
            }
          }
        } catch (error) {
          createSnackbar({
            text: coreString('defaultErrorMessage'),
            autoDismiss: true,
          });
          if (scannerRef.value && scannerRef.value.start) {
            scannerRef.value.start();
          }
        } finally {
          busy.value = false;
        }
      }

      async function handleConfirm() {
        busy.value = true;
        const sessionPayload = {
          facility: facilityId.value,
          qr_login_token: submittedToken.value,
        };
        if (nextParam.value) {
          sessionPayload['next'] = nextParam.value;
        }
        try {
          const { error } = await login(sessionPayload, false, false);
          if (error) {
            showConfirmModal.value = false;
            submittedToken.value = '';
            confirmedLearnerName.value = '';
            await authBaseRef.value.shake();
            wrongQRCode.value = true;
          } else {
            showConfirmModal.value = false;
            redirectBrowser(nextParam.value || undefined);
          }
        } catch {
          createSnackbar({
            text: coreString('defaultErrorMessage'),
            autoDismiss: true,
          });
        } finally {
          busy.value = false;
        }
      }

      function handleCancel() {
        showConfirmModal.value = false;
        submittedToken.value = '';
        confirmedLearnerName.value = '';
        // Tell the scanner to reset so it can accept a new scan.
        if (scannerRef.value && scannerRef.value.start) {
          scannerRef.value.start();
        }
      }

      return {
        // state
        busy,
        showConfirmModal,
        confirmedLearnerName,
        wrongQRCode,
        backTo,
        hasMultipleFacilities,
        // template refs
        authBaseRef,
        scannerRef,
        // actions
        prevalidate,
        handleConfirm,
        handleCancel,
        // strings
        scanQRCodeTitle$,
        scanQRCodeDescription$,
        wrongQRCode$,
      };
    },
    $trs: {
      documentTitle: {
        message: 'Sign in to Kolibri',
        context: 'User sign-in page for scanning a QR code.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qr-page-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-top: 16px;
  }

  .scan-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

  .scan-description {
    margin: 0 0 24px;
    font-size: 14px;
    text-align: center;
  }

  .error-alert {
    width: 100%;
    max-width: 360px;
    margin-bottom: 16px;
    text-align: start;
  }

  .landscape-auth-context-heading {
    margin-top: 0;
  }

</style>
