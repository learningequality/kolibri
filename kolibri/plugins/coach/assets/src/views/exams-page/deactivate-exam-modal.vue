<template>

  <core-modal :title="$tr('deactivateExam')" @cancel="close">
    <p>
      <span>{{ $tr('areYouSure', { examTitle }) }}</span>
      {{ $tr('noLongerVisible') }}
    </p>
    <p>
      <span v-if="examVisibility.class"><strong>{{ $tr('entireClass') }}</strong></span>
      <span v-else>
        <ul>
          <li v-for="(group, index) in examVisibility.groups" :key="index">
            <strong>{{ group.collection.name }}</strong>
          </li>
        </ul>
      </span>
    </p>
    <div class="footer">
      <k-button :text="$tr('cancel')" appearance="flat-button" @click="close" />
      <k-button :text="$tr('deactivate')" :primary="true" @click="deactivateExam(examId)" />
    </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'deactivateExamModal',
    $trs: {
      deactivateExam: 'Deactivate exam',
      areYouSure: "Are you sure you want to deactivate '{ examTitle }'?",
      noLongerVisible: 'The exam will be no longer be visible to the following:',
      cancel: 'Cancel',
      deactivate: 'Deactivate',
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
        deactivateExam: examActions.deactivateExam,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

</style>
