<template>

  <core-modal :title="$tr('createNewExam')" @cancel="close">
    <p>{{ $tr('useContentFrom') }}</p>
    <ui-select
      :name="$tr('selectChannel')"
      :placeholder="$tr('selectChannel')"
      :options="channelList"
      v-model="selectedChannel"
    />
    <div class="footer">
      <icon-button :text="$tr('cancel')" @click="close"/>
      <icon-button :text="$tr('createExam')" :primary="true" :disabled="!selectedChannel" @click="routeToCreateExamPage"/>
    </div>
  </core-modal>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');
  const PageNames = require('../../constants').PageNames;

  module.exports = {
    $trNameSpace: 'createExamModal',
    $trs: {
      createNewExam: 'Create a new exam',
      createExam: 'Create exam',
      useContentFrom: 'Use content from which channel?',
      selectChannel: 'Select channel',
      cancel: 'cancel',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-select': require('keen-ui/src/UiSelect'),
    },
    props: {
      classId: {
        type: String,
        required: true,
      },
      channels: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        selectedChannel: '',
      };
    },
    computed: {
      channelList() {
        return this.channels.map(channel => ({ id: channel.id, label: channel.name }));
      },
    },
    methods: {
      routeToCreateExamPage() {
        this.$router.push({
          name: PageNames.CREATE_EXAM,
          params: { classId: this.classId, channelId: this.selectedChannel.id }
        });
      },
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: ExamActions.displayExamModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: center
    button
      min-width: 45%

</style>
