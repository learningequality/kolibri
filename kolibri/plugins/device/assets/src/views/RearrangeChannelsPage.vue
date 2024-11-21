<template>

  <ImmersivePage
    :appBarTitle="$tr('editChannelOrderTitle')"
    :route="backRoute"
  >
    <KPageContainer class="device-container">
      <p class="instructions">
        {{ $tr('instructions') }}
      </p>

      <p v-if="!loading && channels.length === 0">
        {{ $tr('noChannels') }}
      </p>

      <template v-else>
        <DragContainer
          class="container"
          :items="channels"
          @sort="handleOrderChange"
        >
          <transition-group
            tag="div"
            name="list"
            class="wrapper"
          >
            <Draggable
              v-for="(channel, index) in channels"
              :key="channel.id"
            >
              <DragHandle>
                <div
                  :class="$computedClass(itemClass)"
                  class="item"
                  :style="{ backgroundColor: $themeTokens.surface }"
                >
                  <DragSortWidget
                    class="sort-widget"
                    :moveUpText="moveChannelUpLabel$"
                    :moveDownText="moveChannelDownLabel$"
                    :isFirst="index === 0"
                    :isLast="index === channels.length - 1"
                    @moveUp="shiftOne(index, -1)"
                    @moveDown="shiftOne(index, +1)"
                  />
                  <div class="title">
                    {{ channel.name }}
                  </div>
                </div>
              </DragHandle>
            </Draggable>
          </transition-group>
        </DragContainer>
      </template>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import DragContainer from 'kolibri-common/components/sortable/DragContainer';
  import DragHandle from 'kolibri-common/components/sortable/DragHandle';
  import Draggable from 'kolibri-common/components/sortable/Draggable';
  import client from 'kolibri/client';
  import urls from 'kolibri/urls';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import DeviceChannelResource from '../apiResources/deviceChannel';
  import useContentTasks from '../composables/useContentTasks';
  import { PageNames } from '../constants';

  export default {
    name: 'RearrangeChannelsPage',
    metaInfo() {
      return {
        title: this.$tr('editChannelOrderTitle'),
      };
    },
    components: {
      DragSortWidget,
      DragContainer,
      DragHandle,
      Draggable,
      ImmersivePage,
    },
    setup() {
      useContentTasks();
      const { canManageContent } = useUser();
      const { createSnackbar } = useSnackbar();
      const { moveChannelUpLabel$, moveChannelDownLabel$ } = searchAndFilterStrings;

      return {
        canManageContent,
        createSnackbar,
        moveChannelUpLabel$,
        moveChannelDownLabel$,
      };
    },
    data() {
      return {
        loading: true,
        channels: [],
      };
    },
    computed: {
      backRoute() {
        return { name: PageNames.MANAGE_CONTENT_PAGE };
      },
      itemClass() {
        return {
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_300,
          },
        };
      },
    },
    beforeMount() {
      if (!this.canManageContent) {
        return this.$router.replace(this.$router.getRoute('MANAGE_CONTENT_PAGE'));
      }
      this.fetchChannels()
        .then(channels => {
          this.channels = [...channels];
          this.loading = false;
        })
        .catch(error => {
          this.$store.dispatch('CORE_SET_ERROR', error);
        });
    },
    methods: {
      postNewOrder(channelIds) {
        return client({
          url: urls['kolibri:kolibri.plugins.device:devicechannelorder'](),
          method: 'POST',
          data: channelIds,
        });
      },
      fetchChannels() {
        return DeviceChannelResource.fetchCollection({
          force: true,
          getParams: {
            available: true,
          },
        });
      },
      shiftOne(index, delta) {
        const newArray = [...this.channels];
        const adjacentItem = newArray[index + delta];
        newArray[index + delta] = newArray[index];
        newArray[index] = adjacentItem;
        // This mimicks the object emitted by @sort event
        this.handleOrderChange({ newArray });
      },
      handleOrderChange(event) {
        const oldArray = [...this.channels];
        // NOTE: have to update channels before POST because doing it after
        // causes a brief 'pick-up' animation after item is dropped.
        this.channels = [...event.newArray];
        this.postNewOrder(event.newArray.map(x => x.id))
          .then(() => {
            this.createSnackbar(this.$tr('successNotification'));
          })
          .catch(() => {
            // HACK completely reset the array to undo the move on the drag list
            this.channels = [];
            this.$nextTick().then(() => {
              this.channels = oldArray;
            });
            this.createSnackbar(this.$tr('failureNotification'));
          });
      },
    },
    $trs: {
      instructions: {
        message: 'Control the order in which channels will be displayed to learners and coaches',
        context: 'Text explaining how the channel reordering feature works',
      },
      successNotification: {
        message: 'Channel order saved',
        context: 'Success message shown when the admin re-orders channels',
      },
      failureNotification: {
        message: 'There was a problem reordering the channels',
        context:
          "Error message that displays if there is a problem reordering channels on the 'Edit channel order' page.",
      },
      noChannels: {
        message: 'There are no channels',
        context:
          "This message will display on the 'Edit channel order' page if there are no channels available.",
      },
      editChannelOrderTitle: {
        message: 'Edit channel order',
        context:
          "Title of the 'Edit channel order' page where users can rearrange the order in which channels will be displayed to learners and coaches.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .instructions {
    margin-bottom: 32px;
  }

  .sort-widget {
    width: 24px;
    height: 24px;
  }

  .item {
    display: flex;
    padding: 8px;
    cursor: grab;
    user-select: none;
    border-radius: $radius;
  }

  .title {
    margin-left: 24px;
  }

  .container {
    max-width: 480px;
  }

</style>
