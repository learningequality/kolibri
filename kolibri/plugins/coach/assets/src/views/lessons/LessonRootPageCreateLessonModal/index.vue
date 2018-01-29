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
        :invalid="descriptionIsInvalid"
        :invalidText="descriptionIsInvalidText"
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
      descriptionIsInvalidText() {
        if (this.descriptionIsVisited || this.formIsSubmitted) {
          if (this.description === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      descriptionIsInvalid() {
        return !!this.descriptionIsInvalidText;
      },
    },
    methods: {
      submitLessonModal(){
        this.formIsSubmitted = true;
        // TODO validation
        // If learnerGroups is empty, then assume entire class is assigned pass in array
        // Otherwise, pass in whole learnerGroups array
        let assignedGroups;
        if (this.learnerGroups.length === 0) {
          assignedGroups = [this.classId];
        } else {
          assignedGroups = [...this.learnerGroups];
        }
        this.createNewLesson(assignedGroups).then();
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
        groups(){
          return [
            {name: 'Group 0', id: '123'},
            {name: 'Group 1', id: '124'},
            {name: 'Group 2', id: '456'},
            {name: 'Group 3', id: '436'},
          ];
        },
        classId: state => state.classId,
      },
      actions: {
        // POSTs a new Lesson object to the server
        createNewLesson(store, assignedGroups) {
          const LessonResource = {
            createModel() {
              return {
                save: () => Promise.resolve(),
              };
            },
          };

          const payload = {
            name: this.title,
            description: this.description,
            resources: [],
            collection: this.classId,
            assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
          };

          return LessonResource.createModel(payload).save();
        }
      },
    },
    $trs: {
      // TODO make these labels more semantic
      cancel: 'Cancel',
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
