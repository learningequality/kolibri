<template>

  <AuthBase
    ref="authBaseRef"
    :busy="busy"
    :landscapeLayout="landscapeLayout"
  >
    <template #header-leading-actions>
      <!--
        AuthBase only renders `header-leading-actions` in landscape layout, so this
        AuthContextHeading will only render in that layout. The AuthContextHeading
        outside of this slot will render in portrait layout.
      -->
      <AuthContextHeading
        class="landscape-auth-context-heading"
        :useBackAction="hasMultipleFacilities"
        :backLabel="coreString('changeLearningFacility')"
        :backTo="backTo"
      />
    </template>

    <AuthContextHeading
      v-if="!landscapeLayout"
      :useBackAction="hasMultipleFacilities"
      :backLabel="coreString('changeLearningFacility')"
      :backTo="backTo"
    />

    <UiAlert
      v-if="wrongPictures"
      class="error-alert"
      type="error"
      :dismissible="false"
    >
      {{ wrongPicturesTryAgain$() }}
    </UiAlert>

    <PicturePasswordGrid
      ref="passwordGridRef"
      class="picture-grid"
      :class="{ 'after-action': hasMultipleFacilities }"
      :iconStyle="picturePasswordStyle"
      :showIconText="picturePasswordShowIconText"
      :clearSequence.sync="clearSequence"
      :landscapeLayout="landscapeLayout"
      @select="onGridSelect"
      @submit="prevalidate"
    />
    <PicturePasswordConfirmModal
      v-if="showConfirmModal"
      :learnerName="confirmedLearnerName"
      :picturePassword="submittedPicturePassword"
      :iconStyle="picturePasswordStyle"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </AuthBase>

</template>


<script>

  import { computed, nextTick, onMounted, ref } from 'vue';
  import useUser from 'kolibri/composables/useUser';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
  import { useRouter, useRoute } from 'vue-router/composables';
  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { useFacilitySelect } from 'kolibri-common/composables/useFacility';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { isTouchDevice } from 'kolibri/utils/browserInfo';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import AuthBase from '../AuthBase';
  import useAuthFlow from '../../composables/useAuthFlow';
  import useAuthWatcher from '../../composables/useAuthWatcher';
  import useAuthRouter from '../../composables/useAuthRouter';
  import AuthContextHeading from '../AuthContextHeading.vue';
  import PicturePasswordGrid from './PictureSignIn/PicturePasswordGrid.vue';
  import PicturePasswordConfirmModal from './PictureSignIn/PicturePasswordConfirmModal.vue';

  export default {
    name: 'PictureSignInPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AuthBase,
      AuthContextHeading,
      PicturePasswordGrid,
      PicturePasswordConfirmModal,
      UiAlert,
    },
    mixins: [commonCoreStrings],
    setup() {
      const router = useRouter();
      const route = useRoute();
      const { login } = useUser();
      const { createSnackbar } = useSnackbar();
      const { windowIsLandscape } = useKResponsiveWindow();
      const { wrongPicturesTryAgain$ } = picturePasswordStrings;
      const { nextParam, defaultRoute, getFacilitySelectionRoute } = useAuthRouter(route);
      const {
        hasMultipleFacilities,
        facilityId,
        signInOptions,
        picturePasswordStyle,
        picturePasswordShowIconText,
      } = useAuthFlow();
      const { watchForFacilityChange, watchForFacilityConfigChange } = useAuthWatcher();
      const { setSelectedFacilityId } = useFacilitySelect();

      const busy = ref(false);
      const clearSequence = ref(false);
      const showConfirmModal = ref(false);
      const confirmedLearnerName = ref('');
      const submittedPicturePassword = ref('');
      const wrongPictures = ref(false);

      // Template refs for calling public methods on child components
      const authBaseRef = ref(null);
      const passwordGridRef = ref(null);
      const backTo = computed(() => {
        return hasMultipleFacilities.value ? getFacilitySelectionRoute(false) : null;
      });

      const landscapeLayout = computed(() => {
        // Only show the landscape layout if the window is wide enough and it's a touch device.
        // So that we don't change the layout for desktop users.
        return windowIsLandscape.value && isTouchDevice;
      });

      onMounted(() => {
        nextTick(() => passwordGridRef.value?.focusSentinel());
      });

      watchForFacilityChange((newFacilityId, oldFacilityId) => {
        // If the facility ID is unset, it could mean the facility is no longer an option
        if (
          (!newFacilityId && oldFacilityId) ||
          !signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)
        ) {
          router.push(defaultRoute.value);
        }
      });

      // watches only if the configuration itself changes, the above watcher catches if the
      // facility changes
      watchForFacilityConfigChange(() => {
        if (!signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
          router.push(defaultRoute.value);
        }
      });

      /**
       * Handles authentication once the user has entered a picture password and submits it
       * @param {string} picturePassword - The picture-password sequence the user entered.
       * @returns {Promise<void>}
       */
      async function prevalidate(picturePassword) {
        busy.value = true;
        wrongPictures.value = false;
        setSelectedFacilityId(facilityId.value);
        try {
          const { data, error } = await login(
            { picture_password: picturePassword, facility: facilityId.value },
            true,
            false,
          );
          if (data) {
            submittedPicturePassword.value = picturePassword;
            confirmedLearnerName.value = data.full_name;
            await passwordGridRef.value.playSuccessAnimation(); // Play animation first
            showConfirmModal.value = true; // Then show modal
          } else if (error) {
            await authBaseRef.value.shake();
            passwordGridRef.value?.focusSentinel();
            clearSequence.value = true;
            await nextTick();
            wrongPictures.value = true;
          }
        } catch (error) {
          createSnackbar({
            text: coreString('defaultErrorMessage'),
            autoDismiss: true,
          });
        } finally {
          busy.value = false;
        }
      }

      async function handleConfirm() {
        busy.value = true;
        const sessionPayload = {
          facility: facilityId.value,
          picture_password: submittedPicturePassword.value,
        };
        if (nextParam.value) {
          sessionPayload['next'] = nextParam.value;
        }
        try {
          const { error } = await login(sessionPayload, false, false);
          if (error) {
            showConfirmModal.value = false;
            submittedPicturePassword.value = '';
            confirmedLearnerName.value = '';
            await authBaseRef.value.shake();
            passwordGridRef.value?.focusSentinel();
            clearSequence.value = true;
            await nextTick();
            wrongPictures.value = true;
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
        clearSequence.value = true;
      }

      function onGridSelect(len) {
        if (len === 1 && wrongPictures.value) {
          wrongPictures.value = false;
        }
      }

      return {
        // state
        busy,
        clearSequence,
        landscapeLayout,
        showConfirmModal,
        confirmedLearnerName,
        submittedPicturePassword,
        wrongPictures,
        backTo,
        picturePasswordStyle,
        picturePasswordShowIconText,
        hasMultipleFacilities,
        // template refs
        authBaseRef,
        passwordGridRef,
        // actions
        prevalidate,
        handleConfirm,
        handleCancel,
        onGridSelect,
        // strings
        wrongPicturesTryAgain$,
      };
    },
    $trs: {
      documentTitle: {
        message: 'Sign in to Kolibri',
        context: 'User sign in page for using picture password.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .error-alert {
    margin-top: 16px;
    text-align: start;
  }

  .picture-grid {
    margin-top: 20px;

    &.after-action {
      margin-top: 10px;
    }
  }

  .landscape-auth-context-heading {
    margin-top: 0;
  }

</style>
