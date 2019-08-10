<template>

  <KModal
    :title="$tr('modalTitle')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    :hasError="false"
    @submit="classDelete"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ClassDeleteModal',
    mixins: [commonCoreStrings],
    props: {
      classname: {
        type: String,
        required: true,
      },
      classid: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('classManagement', ['deleteClass']),
      classDelete() {
        this.deleteClass(this.classid);
      },
    },
    $trs: {
      modalTitle: 'Delete class',
      confirmation: "Are you sure you want to delete '{ classname }'?",
      description:
        "Enrolled users will be removed from the class but remain accessible from the 'Users' tab.",
    },
  };

</script>


<style lang="scss" scoped></style>
