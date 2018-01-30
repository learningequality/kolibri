<template>

  <core-modal
    :title="$tr('newLesson')"
    @cancel="closeModal()"
  >
    <form @submit.prevent="submitLessonModal">
      <k-textbox
        :label="$tr('title')"
        :maxlength="50"
        :autofocus="true"
        :invalid="titleIsInvalid"
        :invalidText="titleIsInvalidText"
        v-model="title"
      />
      <k-textbox
        :label="$tr('description')"
        :maxlength="200"
        v-model="description"
      />

      <fieldset>
        <legend>{{ $tr('recipient') }}</legend>
        <k-radio-button
          :radiovalue="true"
          :label="$tr('entireClass')"
          :value="entireClassIsSelected"
          @change="learnerGroups = []"
        />
        <k-checkbox
          v-for="group in groups"
          :key="group.id"
          :label="group.name"
          :checked="groupIsChecked(group.id)"
          @change="toggleGroup($event, group.id)"
        />
      </fieldset>
      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="closeModal()"
        />
        <k-button
          :text="$tr('continue')"
          type="submit"
          :primary="true"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { LessonResource } from 'kolibri.resources';
  import { updateLessons } from '../../../state/actions/lessons';
  import { PageNames } from '../../../constants';

  const { LESSONS: lessonPageNames } = PageNames;
  export default {
    name: 'LessonRootPageCreateLessonModal',
    components: {
      coreModal,
      kButton,
      kCheckbox,
      kRadioButton,
      kTextbox,
    },
    data() {
      return {
        title: '',
        description: '',
        titleIsVisited: false,
        descriptionIsVisited: false,
        learnerGroups: [],
        formIsSubmitted: false,
      };
    },
    computed: {
      entireClassIsSelected() {
        return !this.learnerGroups.length;
      },
      titleIsInvalidText() {
        if (this.titleIsVisited || this.formIsSubmitted) {
          if (this.title === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      titleIsInvalid() {
        return !!this.titleIsInvalidText;

      },
      formIsValid() {
        return !(this.titleIsInvalid)
      },
    },
    methods: {
      submitLessonModal(){
        this.formIsSubmitted = true;
        let assignedGroups;
        if (this.learnerGroups.length === 0) {
          assignedGroups = [this.classId];
        } else {
          assignedGroups = [...this.learnerGroups];
        }

        if(this.formIsValid){
          this.createNewLesson(assignedGroups).then();
        }
      },
      toggleGroup(isChecked, id){
        if(isChecked){
          this.learnerGroups.push(id);
        } else {
          this.learnerGroups = this.learnerGroups.filter(groupId => id !== groupId);
        }
      },
      groupIsChecked(groupId) {
        return this.learnerGroups.includes(groupId);
      },
      closeModal() {
        this.$emit('cancel');
      }
    },
    vuex: {
      getters: {
        groups: state => state.pageState.learnerGroups,
        classId: state => state.classId,
      },
      actions: {
        // POSTs a new Lesson object to the server
        createNewLesson(store, assignedGroups) {
          const payload = {
            name: this.title,
            description: this.description,
            resources: [],
            collection: this.classId,
            assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
          };

          return LessonResource.createModel(payload).save().then(
            lesson => {
              this.updateLessons(this.classId);
              this.$router.push({
                name: lessonPageNames.SUMMARY,
                params: {
                  classId: this.classId,
                  lessonId: lesson.id,
                },
              });
            }
          );
        },
        updateLessons,
      },
    },
    $trs: {
      // TODO make these labels more semantic
      cancel: 'Cancel',
      required: 'This is required',
      continue: 'Continue',
      description: 'Description',
      entireClass: 'Entire class',
      newLesson: 'New lesson',
      recipient: 'Recipient',
      title: 'Title',
    },
  };

</script>


<style lang="stylus" scoped></style>
