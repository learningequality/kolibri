<template>

  <KModal
    :title="learnerLimitReachedHeading$()"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p data-testid="context-paragraph">{{ learnerLimitReachedContext$() }}</p>
    <p data-testid="notice-paragraph">{{ learnerLimitReachedNotice$() }}</p>
    <template #actions>
      <KButtonGroup>
        <KButton
          appearance="flat-button"
          :text="goToFacilitySettingsLabel$()"
          @click="navigateToFacilitySettings"
        />
        <KButton
          :text="closeLabel$()"
          type="submit"
        />
      </KButtonGroup>
    </template>
  </KModal>

</template>


<script>

  import { useRouter } from 'vue-router/composables';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { PageNames } from '../constants.js';

  export default {
    name: 'LearnerLimitReachedModal',
    setup() {
      const router = useRouter();

      const {
        learnerLimitReachedHeading$,
        learnerLimitReachedContext$,
        learnerLimitReachedNotice$,
        goToFacilitySettingsLabel$,
      } = picturePasswordStrings;

      function navigateToFacilitySettings() {
        router.push({ name: PageNames.FACILITY_CONFIG_PAGE });
      }

      return {
        // strings
        learnerLimitReachedHeading$,
        learnerLimitReachedContext$,
        learnerLimitReachedNotice$,
        goToFacilitySettingsLabel$,
        closeLabel$: () => coreString('closeAction'),

        // functions
        navigateToFacilitySettings,
      };
    },
  };

</script>
