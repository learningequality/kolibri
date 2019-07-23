<template>

  <div>
    <KModal
      v-if="!privacyModalVisible"
      :title="$tr('title')"
      :cancelText="$tr('skipUpdateProfileAction')"
      :submitText="$tr('updateProfileAction')"
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
          :text="$tr('usageAndPrivacyLabel')"
          appearance="basic-link"
          @click="privacyModalVisible = true"
        />
      </p>
    </KModal>
    <PrivacyInfoModal
      v-if="privacyModalVisible"
      hideOwnersSection
      @cancel="privacyModalVisible = false"
    />
  </div>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import KButton from 'kolibri.coreVue.components.KButton';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';

  export default {
    name: 'UpdateYourProfileModal',
    components: {
      KButton,
      KModal,
      PrivacyInfoModal,
    },
    data() {
      return {
        privacyModalVisible: false,
      };
    },
    $trs: {
      title: 'Update your profile',
      updateProfileExplanation:
        'Some information is missing from your profile. Would you like to update it?',
      skipUpdateProfileAction: 'Skip',
      updateProfileAction: 'Update',
      usageAndPrivacyLabel: 'Usage and privacy',
    },
  };

</script>
