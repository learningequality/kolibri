<template>

  <KModal
    :title="$tr('deleteLearnerGroup')"
    :submitText="coreCommon$tr('deleteAction')"
    :cancelText="coreCommon$tr('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'DeleteGroupModal',
    components: {
      KModal,
    },
    mixins: [coreStringsMixin],
    props: {
      groupName: {
        type: String,
        required: true,
      },
      groupId: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('groups', ['deleteGroup']),
      handleSubmit() {
        this.deleteGroup(this.groupId).then(() => {
          this.$emit('submit');
        });
      },
    },
    $trs: {
      deleteLearnerGroup: 'Delete group',
      areYouSure: "Are you sure you want to delete '{ groupName }'?",
    },
  };

</script>


<style lang="scss" scoped></style>
