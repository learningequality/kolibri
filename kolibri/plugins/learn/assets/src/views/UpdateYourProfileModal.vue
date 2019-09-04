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
      title: 'Update your profile',
      updateProfileExplanation:
        'Some information is missing from your profile. Would you like to update it?',
      skipUpdateProfileAction: 'Skip',
    },
  };

</script>
