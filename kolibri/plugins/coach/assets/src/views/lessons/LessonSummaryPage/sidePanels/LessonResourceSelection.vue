<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="closeSidePanel"
    @shouldFocusFirstEl="() => null"
  >
    <template #header>
      <h1 class="side-panel-title">{{ $tr('manageLessonResourcesTitle') }}</h1>
    </template>
    <div v-if="loading">
      <KCircularLoader />
    </div>
    <div v-else>
      <div v-if="bookmarks.length > 0">
        <h2 class="side-panel-subtitle">
          {{ selectFromBookmarks$() }}
        </h2>
        <KCardGrid layout="1-1-1">
          <KCard
            :title="bookmarksLabel$()"
            :headingLevel="3"
            :to="{}"
            orientation="horizontal"
            thumbnailDisplay="large"
            thumbnailAlign="right"
            :style="{
              height: '172px',
            }"
          >
            <template #thumbnailPlaceholder>
              <KIcon
                :style="{
                  fontSize: '48px',
                }"
                icon="bookmark"
                :color="$themePalette.grey.v_700"
              />
            </template>
            <template #belowTitle>
              <span>
                {{ numberOfBookmarks$({ count: bookmarks.length }) }}
              </span>
            </template>
          </KCard>
        </KCardGrid>
      </div>
      <div>
        <div class="channels-header">
          <h2 class="side-panel-subtitle">
            {{ selectFromChannels$() }}
          </h2>
          <KButton
            icon="filter"
            :text="searchLabel$()"
          />
        </div>
        <KCardGrid layout="1-1-1">
          <AccessibleChannelCard
            v-for="channel of channels"
            :key="channel.id"
            :contentNode="channel"
            :to="{}"
            :headingLevel="3"
          />
        </KCardGrid>
      </div>
    </div>

    <template #bottomNavigation>
      <div class="bottom-nav-container">
        <KButton
          primary
          :text="saveAndFinishAction$()"
          @click="closeSidePanel"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { ref } from '@vue/composition-api';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
  import AccessibleChannelCard from 'kolibri-common/components/Cards/AccessibleChannelCard.vue';

  export default {
    name: 'LessonResourceSelection',
    components: {
      SidePanelModal,
      AccessibleChannelCard,
    },
    setup() {
      const loading = ref(false);
      const bookmarks = ref([]);
      const channels = ref([]);

      const loadBookmarks = async () => {
        const data = await ContentNodeResource.fetchBookmarks({
          params: { limit: 25, available: true },
        });

        bookmarks.value = data.results || [];
      };

      const loadChannels = async () => {
        const response = await ChannelResource.fetchCollection({
          getParams: {
            available: true,
          },
        });
        channels.value = response;
      };

      const loadData = async () => {
        loading.value = true;
        await Promise.all([loadBookmarks(), loadChannels()]);
        loading.value = false;
      };

      loadData();

      const {
        selectFromChannels$,
        numberOfBookmarks$,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
        saveAndFinishAction$,
      } = coreStrings;

      return {
        loading,
        bookmarks,
        channels,
        selectFromChannels$,
        numberOfBookmarks$,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
        saveAndFinishAction$,
      };
    },
    methods: {
      closeSidePanel() {
        this.$router.go(-1);
      },
    },
    $trs: {
      manageLessonResourcesTitle: {
        message: 'Manage lesson resources',
        context:
          "In the 'Manage lesson resources' coaches can add new/remove resource material to a lesson.",
      },
    },
  };

</script>


<style scoped>

  .side-panel-title {
    margin-top: 20px;
    font-size: 18px;
  }

  .side-panel-subtitle {
    font-size: 16px;
  }

  .channels-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    margin-bottom: 16px;
  }

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

</style>
