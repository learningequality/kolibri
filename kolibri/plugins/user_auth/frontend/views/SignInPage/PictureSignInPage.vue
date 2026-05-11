<template>

  <AuthBase
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

    <PicturePasswordGrid
      class="picture-grid"
      :class="{ 'after-action': hasMultipleFacilities }"
      :iconStyle="picturePasswordStyle"
      :showIconText="picturePasswordShowIconText"
      :wrongSequence="wrongSequence"
      :landscapeLayout="landscapeLayout"
      @wrongSequenceHandled="wrongSequence = false"
      @submit="createSession"
    />
  </AuthBase>

</template>


<script>

  import { computed, ref } from 'vue';
  import useUser from 'kolibri/composables/useUser';
  import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
  import { useRouter, useRoute } from 'vue-router/composables';
  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { useFacilitySelect } from 'kolibri-common/composables/useFacility';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { isTouchDevice } from 'kolibri/utils/browserInfo';

  import AuthBase from '../AuthBase';
  import useAuthFlow from '../../composables/useAuthFlow';
  import useAuthWatcher from '../../composables/useAuthWatcher';
  import useAuthRouter from '../../composables/useAuthRouter';
  import AuthContextHeading from '../AuthContextHeading.vue';
  import PicturePasswordGrid from './PictureSignIn/PicturePasswordGrid.vue';

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
    },
    mixins: [commonCoreStrings],
    setup() {
      const router = useRouter();
      const route = useRoute();
      const { login } = useUser();
      const { createSnackbar } = useSnackbar();
      const { windowIsLandscape } = useKResponsiveWindow();
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
      const wrongSequence = ref(false);
      const backTo = computed(() => {
        return hasMultipleFacilities.value ? getFacilitySelectionRoute(false) : null;
      });

      const landscapeLayout = computed(() => {
        // Only show the landscape layout if the window is wide enough and it's a touch device.
        // So that we don't change the layout for desktop users.
        return windowIsLandscape.value && isTouchDevice;
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
       *
       * @param {string} picturePassword
       * @return {Promise<void>}
       */
      async function createSession(picturePassword) {
        busy.value = true;
        const sessionPayload = {
          facility: facilityId.value,
          picture_password: picturePassword,
        };

        if (nextParam.value) {
          sessionPayload['next'] = nextParam.value;
        }

        // ensure selected facility in local storage is synchronized
        setSelectedFacilityId(facilityId.value);

        try {
          const err = await login(sessionPayload);
          if (err) {
            wrongSequence.value = true;
          }
        } catch (error) {
          // The `login` function already handles logging errors
          createSnackbar({
            text: coreString('defaultErrorMessage'),
            autoDismiss: true,
          });
        } finally {
          busy.value = false;
        }
      }

      return {
        // state
        busy,
        wrongSequence,
        landscapeLayout,
        backTo,
        picturePasswordStyle,
        picturePasswordShowIconText,
        hasMultipleFacilities,
        // actions
        createSession,
      };
    },
    $trs: {
      documentTitle: {
        message: 'User Picture Password Sign In',
        context: 'User sign in page for using picture password.',
      },
    },
  };

</script>


<style lang="scss" scoped>

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
