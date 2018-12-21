<template>

  <div>
    <h2>{{ $tr('details') }}</h2>
    <KTextbox
      v-model="lessonTitle"
      :label="$tr('lessonTitle')"
    />
    <KTextbox
      v-model="lessonDescription"
      :label="$tr('lessonDescription')"
    />

    <h2>{{ $tr('status') }}</h2>
    <p>{{ $tr('statusDescription') }}</p>
    <p>
      <KRadioButton
        v-model="isActive"
        :label="$tr('lessonActive')"
        value="active"
      />
      <KRadioButton
        v-model="isActive"
        :label="$tr('lessonInactive')"
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
  import RecipientSelector from '../../assignments/RecipientSelector';

  export default {
    name: 'LessonDetailEditor',
    components: {
      RecipientSelector,
      KTextbox,
      KButton,
      KRadioButton,
    },
    data() {
      return {
        lessonTitle: 'Lesson A',
        lessonDescription: 'Ipsum lorem',
        selectedCollectionIds: ['a'],
        availableGroups: [{ name: 'Group A', id: 'a' }, { name: 'Group B', id: 'b' }],
        selectedClassroomId: 'x',
        isActive: true,
      };
    },
    $trs: {
      details: 'Details',
      lessonTitle: 'Title',
      duplicateTitle: 'A lesson with that name already exists',
      status: 'Lesson status',
      statusDescription: 'Learners can only see active quizzes',
      lessonActive: 'Active',
      lessonInactive: 'Inactive',
      recipients: 'Recipients',
      recipientsDescription: 'This lesson will be visible to:',
      lessonDescription: 'Description',
      save: 'Save',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped></style>
