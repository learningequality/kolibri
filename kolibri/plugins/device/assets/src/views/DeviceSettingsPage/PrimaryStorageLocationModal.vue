<template>

  <KModal
    :title="$tr('changePrimaryLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('primaryLocationChangeDescription') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'PrimaryStorageLocationModal',
    mixins: [commonCoreStrings],
    $trs: {
      changePrimaryLocation: {
        message: 'Change primary storage location',
        context: 'Prompt for changing the primary storage location.',
      },
      primaryLocationChangeDescription: {
        message: 'Newly downloaded resources will be added to the primary storage location',
        context: 'Description of primary storage location change message.',
      },
    },
  };

</script>
