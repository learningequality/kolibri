<template>

  <KModal :title="copyClass$()">
    <KCircularLoader v-if="loading" />
    <div v-else>
      <KTextbox
        v-model="copiedClassName"
        type="text"
        :label="coreString('classNameLabel')"
        :autofocus="true"
        :maxlength="120"
        :showInvalidText="true"
        :invalid="Boolean(classNameInvalidText)"
        :invalidText="classNameInvalidText"
      />
      <div class="checkbox-container">
        <KCheckbox
          v-if="classLearnerIds.length"
          :checked="copyAllLearners"
          :label="copyAllLearners$({ n: classLearnerIds.length })"
          @change="copyAllLearners = $event"
        />
        <KCheckbox
          v-if="classCoachesIds.length"
          :checked="copyAllCoaches"
          :label="copyAllCoaches$({ n: classCoachesIds.length })"
          @change="copyAllCoaches = $event"
        />
      </div>
    </div>
    <template #actions>
      <KButtonGroup>
        <KButton
          :text="coreString('cancelAction')"
          :disabled="loading"
          @click="$emit('close')"
        />
        <KButton
          primary
          :text="makeACopy$()"
          :disabled="Boolean(classNameInvalidText) || loading"
          @click="copyClass"
        />
      </KButtonGroup>
    </template>
  </KModal>

</template>


<script>

  import { computed, getCurrentInstance, onMounted, ref } from 'vue';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { UserKinds } from 'kolibri/constants';
  import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
  import RoleResource from 'kolibri-common/apiResources/RoleResource';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  export default {
    name: 'ClassCopyModal',
    mixins: [commonCoreStrings],
    setup(props, context) {
      const classCoachesIds = ref([]);
      const classLearnerIds = ref([]);
      const loading = ref(false);
      const copyAllLearners = ref(true);
      const copyAllCoaches = ref(false);
      const createdClass = ref(null);
      const copiedClassName = ref(null);
      const store = getCurrentInstance().proxy.$store;
      const {
        copyClass$,
        makeACopy$,
        copyOfClass$,
        copyAllCoaches$,
        copyAllLearners$,
        classNameAlreadyExists$,
        classCopiedSuccessfully$,
      } = bulkUserManagementStrings;
      const { coreString } = commonCoreStrings.methods;
      const { createSnackbar } = useSnackbar();
      const { classToCopy, classes } = props;

      const classNameInvalidText = computed(() => {
        if (!loading.value) {
          const nameValue = copiedClassName.value || '';
          const normalize = str => str.replace(/\s+/g, ' ').toLowerCase();
          const name = normalize(nameValue).trim();
          if (!name) {
            return coreString('requiredFieldError');
          } else if (classes.some(row => normalize(row.name) === name)) {
            return classNameAlreadyExists$({ class: name });
          }
        }
        return '';
      });

      // methods
      function closeWithSnackbar(message) {
        context.emit('close');
        createSnackbar(message);
      }

      function handleApiFailure(error) {
        context.emit('close');
        store.dispatch('handleApiError', { error }, { root: true });
      }

      async function createClass() {
        const classroom = await ClassroomResource.saveModel({
          data: {
            name: copiedClassName.value.trim(),
            parent: classToCopy.parent,
          },
        });
        createdClass.value = classroom;
      }

      function assignCoachesToClass() {
        if (!copyAllCoaches.value || !classCoachesIds.value.length) return Promise.resolve();
        return RoleResource.saveCollection({
          data: classCoachesIds.value.map(coachId => ({
            user: coachId,
            kind: UserKinds.COACH,
            collection: createdClass.value.id,
          })),
        });
      }

      function assignLearnersToClass() {
        if (!copyAllLearners.value || !classLearnerIds.value.length) return Promise.resolve();
        return MembershipResource.saveCollection({
          data: classLearnerIds.value.map(learnerId => ({
            user: learnerId,
            collection: createdClass.value.id,
          })),
        });
      }

      async function copyClass() {
        loading.value = true;
        try {
          await createClass();
          await Promise.all([assignCoachesToClass(), assignLearnersToClass()]);

          // Update createdClass obj with copied data if necessary
          if (copyAllCoaches.value) {
            createdClass.value = {
              ...createdClass.value,
              coaches: classToCopy.coaches,
            };
          }
          if (copyAllLearners.value) {
            createdClass.value = {
              ...createdClass.value,
              learner_count: classToCopy.learner_count,
            };
          }

          store.commit('classManagement/SET_STATE', { classes: [...classes, createdClass.value] });
          context.emit('success');
          closeWithSnackbar(classCopiedSuccessfully$());
        } catch (error) {
          handleApiFailure(error);
        } finally {
          loading.value = false;
        }
      }

      async function setClassData() {
        loading.value = true;
        try {
          copiedClassName.value = copyOfClass$({ class: classToCopy.name });
          classCoachesIds.value = classToCopy.coaches.map(coach => coach.id);
          const classLearners = await FacilityUserResource.fetchCollection({
            getParams: {
              member_of: classToCopy.id,
              exclude_coach_for: classToCopy.id,
            },
            force: true,
          });
          classLearnerIds.value = classLearners.map(learner => learner.id);
        } catch (error) {
          handleApiFailure(error);
        } finally {
          loading.value = false;
        }
      }

      onMounted(() => {
        setClassData();
      });

      return {
        // ref and computed properties
        loading,
        copyAllCoaches,
        copiedClassName,
        copyAllLearners,
        classCoachesIds,
        classLearnerIds,
        classNameInvalidText,

        // strings
        copyClass$,
        makeACopy$,
        copyAllCoaches$,
        copyAllLearners$,

        // methods
        copyClass,
      };
    },
    props: {
      classToCopy: {
        type: Object,
        required: true,
      },
      classes: {
        type: Array,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .checkbox-container {
    position: relative;
    bottom: 5px;
  }

</style>
