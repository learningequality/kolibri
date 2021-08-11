<template>

  <div>
    <KModal
      v-if="!privacyModalVisible"
      :title="$tr('title')"
      :cancelText="$tr('skipUpdateProfileAction')"
      :submitText="coreString('updateAction')"
      :cancelDisabled="$attrs.disabled"
      :submitDisabled="$attrs.disabled"
      @cancel="$emit('cancel')"
      @submit="$emit('submit')"
    >
      <p>
        {{ $tr('updateProfileExplanation') }}
      </p>
      <p>
        <KButton
          :text="coreString('usageAndPrivacyLabel')"
          appearance="basic-link"
          @click="privacyModalVisible = true"
        />
      </p>
    </KModal>
    <PrivacyInfoModal
      v-if="privacyModalVisible"
      hideOwnersSection
      @cancel="privacyModalVisible = false"
      @submit="privacyModalVisible = false"
    />
  </div>

</template>


<script>

  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'UpdateYourProfileModal',
    components: {
      PrivacyInfoModal,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        privacyModalVisible: false,
      };
    },
    $trs: {
      title: {
        message: 'Update your profile',
        context:
          "If a user account has been created prior to version 0.13 of Kolibri, the user will see a notification that they can update their profile to provide their birth year and gender.\n\nSelecting 'UPDATE' opens the 'Update your profile' window.",
      },
      updateProfileExplanation: {
        message: 'Some information is missing from your profile. Would you like to update it?',
        context:
          "If a user account has been created prior to version 0.13 of Kolibri, the user will see a notification that they can update their profile to provide their birth year and gender.\n\nSelecting 'UPDATE' opens the 'Update your profile' window with this message.",
      },
      skipUpdateProfileAction: {
        message: 'Skip',
        context:
          "If a user account has been created prior to version 0.13 of Kolibri, the user will see a notification that they can update their profile to provide their birth year and gender.\n\nThe user can choose not to update their profile by selecting 'SKIP'.",
      },
    },
  };

</script>
