<template>

  <core-modal
    :title="$tr('title')"
    @cancel="handleClickCancel()"
  >
    <p>{{ $tr('confirmationQuestion', { channelTitle }) }}</p>

    <div class="core-modal-buttons">
      <k-button
        :primary="false"
        @click="handleClickCancel()"
        :text="$tr('cancelButtonLabel')"
      />

      <k-button
        name="confirm"
        :primary="true"
        @click="handleClickConfirm()"
        :text="$tr('confirmButtonLabel')"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'deleteChannelModal',
    components: {
      coreModal,
      kButton,
    },
    props: {
      channelTitle: {
        type: String,
        required: true,
      },
    },
    methods: {
      handleClickCancel() {
        this.$emit('cancel');
      },
      handleClickConfirm() {
        this.$emit('confirm');
      },
    },
    $trs: {
      confirmationQuestion: `Are you sure you want to delete '{ channelTitle }' from your device?`,
      title: 'Delete channel',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Delete',
    },
  };

</script>


<style lang="stylus" scoped></style>
