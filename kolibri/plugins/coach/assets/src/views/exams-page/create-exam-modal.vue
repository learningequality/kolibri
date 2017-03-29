<template>

  <core-modal :title="$tr('createNewExam')" @cancel="close">
     <h2>{{ $tr('selectChannelTo') }}</h2>
      <ui-select
        :name="$tr('selectChannel')"
        :placeholder="$tr('selectChannel')"
        :options="channelList"
        v-model="selectedChannel"
      />
    <icon-button
      :text="$tr('selectChannel')"
      :primary="true"
      :disabled="!selectedChannel"
      @click="getChannelExercises(selectedChannel.id, selectedChannelRootPk)"/>

    <icon-button :text="$tr('close')" @click="close"/>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'createExamModal',
    $trs: {
      createNewExam: 'Create a new exam',
      selectChannelTo: 'Select channel to choose exercises from',
      selectChannel: 'Select channel',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      examId: {
        type: String,
        required: true,
      },
      examTitle: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
    },
    computed: {
      channelList() {
        return this.channels.map(channel => ({ id: channel.id, label: channel.name }));
      },
    },
    methods: {
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: examActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
