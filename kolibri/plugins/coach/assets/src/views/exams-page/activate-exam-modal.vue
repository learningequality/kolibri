<template>

  <core-modal :title="$tr('activateExam')" @cancel="close">
    <p>
      <span>{{ $tr('areYouSure', { examTitle }) }}</span>
      {{ $tr('willBeVisible') }}
    </p>
    <p>
      <span v-if="examVisibility.class"><strong>{{ $tr('entireClass') }}</strong></span>
      <span v-else>
        <ul>
          <li v-for="(group, index) in examVisibility.groups" :key="index"><strong>{{ group.collection.name }}</strong></li>
        </ul>
      </span>
    </p>
    <div class="footer">
      <k-button :text="$tr('cancel')" appearance="flat-button" @click="close" />
      <k-button :text="$tr('activate')" :primary="true" @click="activateExam(examId)" />
    </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'activateExamModal',
    $trs: {
      activateExam: 'Activate exam',
      areYouSure: "Are you sure you want to activate '{ examTitle }'?",
      willBeVisible: 'The exam will be visible to the following:',
      cancel: 'Cancel',
      activate: 'Activate',
      entireClass: 'Entire class',
    },
    components: {
      coreModal,
      kButton,
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
      examVisibility: {
        type: Object,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
    },
    methods: {
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: examActions.displayExamModal,
        activateExam: examActions.activateExam,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

</style>
