<template>

  <KModal
    :title="$tr('deleteResourcesTitle')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit', { deleteEverywhere })"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>
        {{ $tr('deleteConfirmation') }}
      </p>
      <KCheckbox
        v-model="deleteEverywhere"
        :label="$tr('deleteEverywhereLabel')"
        @change="deleteEverywhere = $event"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeleteResourcesModal',
    mixins: [commonCoreStrings],
    data() {
      return {
        deleteEverywhere: false,
      };
    },
    $trs: {
      deleteResourcesTitle: 'Delete resources',
      deleteConfirmation: 'Are you sure you want to delete these resources from your device?',
      deleteEverywhereLabel: 'Also delete any copies found in other locations and channels',
    },
  };

</script>


<style lang="scss" scoped></style>
