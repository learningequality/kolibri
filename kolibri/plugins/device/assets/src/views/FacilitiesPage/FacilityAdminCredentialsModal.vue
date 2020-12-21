<template>

  <!-- Admin Credentials Step -->
  <KModal
    :title="getCommonSyncString('adminCredentialsTitle')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="formDisabled"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <FacilityAdminCredentialsForm
      ref="credentialsForm"
      :facility="facility"
      :device="device"
      :disabled="formDisabled"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { FacilityAdminCredentialsForm } from 'kolibri.coreVue.componentSets.sync';

  export default {
    name: 'FacilityAdminCredentialsModal',
    components: {
      FacilityAdminCredentialsForm,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      device: {
        type: Object,
        required: true,
      },
      facility: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        formDisabled: false,
      };
    },
    methods: {
      handleSubmit() {
        this.formDisabled = true;
        this.$refs.credentialsForm.startImport().then(taskId => {
          if (taskId) {
            this.$emit('submit', taskId);
          } else {
            this.formDisabled = false;
          }
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
