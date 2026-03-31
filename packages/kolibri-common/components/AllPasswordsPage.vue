<template>

  <KPageContainer>
    <KButton
      :text="printAction$()"
      appearance="raised"
      class="print-button"
      @click="$emit('print')"
    />

    <KCircularLoader v-if="loading" />

    <CoreTable v-else>
      <template #headers>
        <th>{{ coreString('fullNameLabel') }}</th>
        <th>{{ coreString('usernameLabel') }}</th>
        <th>{{ picturePasswordLabel$() }}</th>
      </template>
      <template #tbody>
        <tbody>
          <tr
            v-for="learner in learners"
            :key="learner.id"
          >
            <td>
              <KLabeledIcon
                icon="person"
                :label="learner.full_name"
              />
            </td>
            <td>
              <span dir="auto">{{ learner.username }}</span>
            </td>
            <td>
              <template v-if="learner.picture_password">
                {{ resolvePicturePassword(learner.picture_password) }}
              </template>
              <span
                v-else
                class="no-password-text"
              >
                {{ noPicturePasswordDescription$() }}
              </span>
            </td>
          </tr>
        </tbody>
      </template>
    </CoreTable>
  </KPageContainer>

</template>


<script>

  import { ref, onMounted } from 'vue';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswordStrings';

  export default {
    name: 'AllPasswordsPage',
    components: { CoreTable },
    mixins: [commonCoreStrings],
    setup(props) {
      const learners = ref([]);
      const loading = ref(true);

      const { noPicturePasswordDescription$, printAction$, picturePasswordLabel$ } =
        picturePasswordStrings;

      onMounted(() => {
        FacilityUserResource.fetchCollection({
          getParams: { member_of: props.classId },
          force: true,
        })
          .then(data => {
            learners.value = data;
          })
          .finally(() => {
            loading.value = false;
          });
      });

      function resolvePicturePassword(picturePassword) {
        return getPicturePasswordIcons(picturePassword)
          .map(icon => icon.label)
          .join(', ');
      }

      return {
        learners,
        loading,
        resolvePicturePassword,
        noPicturePasswordDescription$,
        printAction$,
        picturePasswordLabel$,
      };
    },
    props: {
      classId: {
        type: String,
        required: true,
      },
    },
    emits: ['print'],
  };

</script>


<style lang="scss" scoped>

  .print-button {
    margin-bottom: 16px;
  }

  .no-password-text {
    font-style: italic;
  }

</style>
