<template>

  <ImmersivePage
    :appBarTitle="allPasswordsHeader$()"
    :route="route"
    :primary="false"
  >
    <KPageContainer>
      <KCircularLoader v-if="loading" />
      <div v-else>
        <KGrid>
          <KGridItem
            :layout12="{ span: 6, alignment: 'left' }"
            :layout8="{ span: 4, alignment: 'left' }"
            :layout4="{ span: 2, alignment: 'left' }"
            class="header-row"
          >
            <h1>{{ allPasswordsHeader$() }}</h1>
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6, alignment: 'right' }"
            :layout8="{ span: 4, alignment: 'right' }"
            :layout4="{ span: 2, alignment: 'right' }"
            class="header-row print-button"
          >
            <KButton :text="printAction$()" />
          </KGridItem>
        </KGrid>
        <CoreTable>
          <template #headers>
            <th
              class="table-header"
              :style="{ color: $themeTokens.text }"
            >
              {{ nameLabel$() }}
            </th>
          </template>
          <template #tbody>
            <tbody>
              <tr
                v-for="learner in learners"
                :key="learner.id"
              >
                <td :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }">
                  <div class="learner-row">
                    <div class="learner-info">
                      <span
                        dir="auto"
                        class="learner-name"
                        :style="{ color: $themeTokens.text }"
                      >{{ learner.full_name }}</span>
                      <span
                        dir="auto"
                        class="learner-username"
                        :style="{ color: $themeTokens.annotation }"
                      >{{ learner.username }}</span>
                    </div>
                    <div class="learner-password">
                      <template v-if="learner.picture_password">
                        {{ resolvePicturePassword(learner.picture_password) }}
                      </template>
                      <div
                        v-else
                        class="no-password-info"
                      >
                        <span
                          class="no-password-title"
                          :style="{ color: $themeTokens.text }"
                        >
                          {{ noPicturePasswordDescription$() }}
                        </span>
                        <span
                          class="no-password-subtitle"
                          :style="{ color: $themeTokens.annotation }"
                        >
                          {{ noPasswordSignInDescription$() }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </template>
        </CoreTable>
      </div>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { ref, onMounted } from 'vue';
  import CoreTable from 'kolibri/components/CoreTable';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import { picturePasswords } from 'kolibri-common/strings/picturePasswords';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';

  export default {
    name: 'AllPasswordsPage',
    components: { CoreTable, ImmersivePage },
    setup(props) {
      const learners = ref([]);
      const loading = ref(true);

      const {
        nameLabel$,
        noPicturePasswordDescription$,
        noPasswordSignInDescription$,
        printAction$,
        allPasswordsHeader$,
      } = picturePasswords;

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
        nameLabel$,
        noPicturePasswordDescription$,
        noPasswordSignInDescription$,
        printAction$,
        allPasswordsHeader$,
      };
    },
    props: {
      classId: {
        type: String,
        required: true,
      },
      route: {
        type: Object,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header-row {
    display: flex;
    align-items: center;
    margin-top: 16px;
    margin-bottom: 16px;

    h1 {
      padding: 8px;
      margin: 0;
    }
  }

  .print-button {
    justify-content: flex-end;
  }

  .table-header {
    font-size: 14px;
  }

  .learner-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 8px 0;
  }

  .learner-info,
  .no-password-info {
    display: flex;
    flex-direction: column;
    padding: 4px;
  }

  .learner-name {
    font-size: 16px;
  }

  .learner-username {
    font-size: 14px;
  }

  .learner-password {
    text-align: right;
  }

  .no-password-title {
    font-size: 14px;
  }

  .no-password-subtitle {
    font-size: 12px;
  }

</style>
