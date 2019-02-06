<template>

  <div>
    <h1>{{ $tr('editQuiz') }}</h1>
    <h2>{{ $tr('details') }}</h2>
    test
    <KTextbox
      v-model="quizTitle"
      :label="$tr('quizTitle')"
    />

    <h2>{{ $tr('status') }}</h2>
    <p>{{ $tr('statusDescription') }}</p>
    <p>
      <KRadioButton
        v-model="isActive"
        :label="$tr('quizActive')"
        value="active"
      />
      <KRadioButton
        v-model="isActive"
        :label="$tr('quizInactive')"
        value="active"
      />
    </p>

    <h2>{{ $tr('recipients') }}</h2>
    <p>{{ $tr('recipientsDescription') }}</p>
    <RecipientSelector
      v-model="selectedCollectionIds"
      :groups="availableGroups"
      :classId="selectedClassroomId"
    />
    <KButton :text="$tr('cancel')" :primary="false" />
    <KButton :text="$tr('save')" :primary="true" />
  </div>

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import RecipientSelector from '../plan/assignments/RecipientSelector';

  export default {
    name: 'QuizDetailEditor',
    components: {
      RecipientSelector,
      KTextbox,
      KButton,
      KRadioButton,
    },
    data() {
      return {
        quizTitle: 'Quiz A',
        selectedCollectionIds: ['a'],
        availableGroups: [{ name: 'Group A', id: 'a' }, { name: 'Group B', id: 'b' }],
        selectedClassroomId: 'x',
        isActive: true,
      };
    },
    $trs: {
      editQuiz: 'Edit quiz',
      details: 'Details',
      quizTitle: 'Title',
      duplicateTitle: 'A quiz with that name already exists',
      status: 'Quiz status',
      statusDescription: 'Learners can only see active quizzes',
      quizActive: 'Active',
      quizInactive: 'Inactive',
      recipients: 'Recipients',
      recipientsDescription: 'This quiz will be visible to:',
      save: 'Save',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped></style>
