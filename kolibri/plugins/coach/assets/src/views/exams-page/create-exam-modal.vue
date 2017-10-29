<template>

  <core-modal :title="$tr('createNewExam')" @cancel="close">
    <p>{{ $tr('useContentFrom') }}</p>
    <ui-select
      :name="$tr('selectChannel')"
      :placeholder="$tr('selectChannel')"
      :options="channelList"
      v-model="selectedChannel"
      class="channel-select"
    />
    <div class="footer">
      <k-button :text="$tr('cancel')" appearance="flat-button" @click="close" />
      <k-button :text="$tr('createExam')" :primary="true" :disabled="!selectedChannel" @click="routeToCreateExamPage" />
    </div>
  </core-modal>

</template>


<script>

  import * as ExamActions from '../../state/actions/exam';
  import { PageNames } from '../../constants';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiSelect from 'kolibri.coreVue.components.uiSelect';
  export default {
    name: 'createExamModal',
    $trs: {
      createNewExam: 'Create a new exam',
      createExam: 'Create exam',
      useContentFrom: 'Use content from which channel?',
      selectChannel: 'Select channel',
      cancel: 'cancel',
    },
    components: {
      coreModal,
      kButton,
      uiSelect,
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
      return { selectedChannel: '' };
    },
    computed: {
      channelList() {
        return this.channels.map(channel => ({
          id: channel.id,
          label: channel.name,
        }));
      },
    },
    methods: {
      routeToCreateExamPage() {
        this.$router.push({
          name: PageNames.CREATE_EXAM,
          params: {
            classId: this.classId,
            channelId: this.selectedChannel.id,
          },
        });
      },
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: { actions: { displayExamModal: ExamActions.displayExamModal } },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

  .channel-select
    padding-bottom: 4rem

</style>


<style lang="stylus">

  .channel-select
    .ui-select__options
      max-height: 5rem

</style>
