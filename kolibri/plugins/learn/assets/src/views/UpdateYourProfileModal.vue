<template>

  <div>
    <KModal
      v-if="!privacyModalVisible"
      :title="$tr('title')"
      :cancelText="$tr('cancelLabel')"
      :submitText="$tr('submitLabel')"
      @cancel="$emit('cancel')"
      @submit="$emit('submit')"
    >
      <p>
        {{ $tr('missingInformationExplanation') }}
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
      missingInformationExplanation: 'You have missing information in your profile',
      cancelLabel: 'Later',
      submitLabel: 'View Profile',
      usageAndPrivacyLabel: 'Usage and privacy in Kolibri',
    },
  };

</script>
