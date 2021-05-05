<template>

  <CoreFullscreen
    ref="html5Renderer"
    class="html5-renderer"
    :style="{ height: contentRendererHeight, width: iframeWidth }"
  >
    <div class="iframe-container" :style="containerStyle">
      <iframe
        ref="iframe"
        class="iframe"
        sandbox="allow-scripts allow-same-origin"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
        frameBorder="0"
        :src="rooturl"
      >
      </iframe>
      <ContentModal
        v-if="overlayIsOpen"
        :contentNode="currentContent"
        :channelTheme="channelTheme"
        @close="overlayIsOpen = false"
      />
    </div>
  </CoreFullscreen>

</template>


<script>

  import pick from 'lodash/pick';
  import urls from 'kolibri.urls';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import Hashi from 'hashi';
  import { now } from 'kolibri.utils.serverClock';
  import { ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import { events, MessageStatuses } from 'hashi/src/hashiBase';
  import { validateTheme } from '../../utils/themes';
  import ContentModal from './ContentModal';

  const defaultContentHeight = '500px';
  const frameTopbarHeight = '37px';
  const pxStringAdd = (x, y) => parseInt(x, 10) + parseInt(y, 10) + 'px';

  export default {
    name: 'CustomContentRenderer',
    components: {
      CoreFullscreen,
      ContentModal,
    },
    props: {
      topic: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        overlayIsOpen: false,
        channelTheme: null,
      };
    },
    computed: {
      context() {
        const fetchedEncodedContext = this.$route.query;
        return JSON.stringify(decodeURI(fetchedEncodedContext));
      },
      rooturl() {
        return urls.hashi();
      },
      iframeHeight() {
        return defaultContentHeight;
      },
      iframeWidth() {
        return 'auto';
      },
      contentRendererHeight() {
        return pxStringAdd(this.iframeHeight, frameTopbarHeight);
      },
      containerStyle() {
        return { height: this.iframeHeight };
      },
    },
    mounted() {
      this.hashi = new Hashi({ iframe: this.$refs.iframe, now });
      const zipFile = this.topic.files.find(f => f.extension === 'zip');
      this.hashi.initialize({}, {}, zipFile.storage_url, zipFile.checksum);
      this.hashi.on('collectionrequested', message => {
        this.fetchContentCollection(message);
      });
      this.hashi.on('modelrequested', message => {
        this.fetchContentModel.call(this, message);
      });
      this.hashi.on('navigateto', message => {
        this.navigateTo.call(this, message);
      });
      this.hashi.on('context', message => {
        this.getOrUpdateContext.call(this, message);
      });
      this.hashi.on('themechanged', theme => {
        delete theme.message_id;
        this.channelTheme = validateTheme(theme);
      });
      this.hashi.on('searchresultrequested', message => {
        this.fetchSearchResult.call(this, message);
      });
    },
    methods: {
      // helper functions for fetching data from kolibri
      // called in mainClient.js

      fetchContentCollection(message) {
        const options = message.options;
        const getParams = pick(options, ['ids', 'parent']);
        if (options.parent && options.parent == 'self') {
          getParams.parent = this.topic.id;
        }
        ContentNodeResource.fetchCollection({ getParams }).then(contentNodes => {
          message.status = contentNodes ? MessageStatuses.SUCCESS : MessageStatuses.FAILURE;
          let response = {};
          response.page = message.options.page ? message.options.page : 1;
          response.pageSize = message.options.pageSize ? message.options.pageSize : 50;
          response.results = contentNodes;
          message.data = response;
          message.type = 'response';
          this.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        });
      },

      fetchContentModel(message) {
        let id = message.id;
        ContentNodeResource.fetchModel({ id }).then(contentNode => {
          message.status = contentNode ? MessageStatuses.SUCCESS : MessageStatuses.FAILURE;
          message.data = contentNode;
          message.type = 'response';
          this.hashi.mediator.sendMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        });
      },

      fetchSearchResult(message) {
        const newMessage = {
          nameSpace: 'hashi',
          event: events.KOLIBRIDATARETURNED,
          data: { ...message, type: 'response' },
        };
        let searchPromise;
        const { keyword } = message.options;
        if (!keyword) {
          searchPromise = Promise.resolve({
            page: 0,
            pageSize: 0,
            results: [],
          });
        } else {
          searchPromise = ContentNodeSearchResource.fetchCollection({
            getParams: { search: keyword },
          }).then(searchResults => {
            return {
              page: 0,
              pageSize: searchResults.total_results,
              results: searchResults.results,
            };
          });
        }

        searchPromise
          .then(response => {
            newMessage.data.data = response;
            newMessage.data.status = MessageStatuses.SUCCESS;
            this.hashi.mediator.sendMessage(newMessage);
          })
          .catch(err => {
            newMessage.data.data = err;
            newMessage.data.status = MessageStatuses.FAILURE;
            this.hashi.mediator.sendMessage(newMessage);
          });
      },

      navigateTo(message) {
        let id = message.nodeId;
        let context = {};
        ContentNodeResource.fetchModel({ id }).then(contentNode => {
          let routeBase, path;
          if (contentNode && contentNode.kind === 'topic') {
            routeBase = '/topics/t';
            path = `${routeBase}/${id}`;
            router.push({ path: path }).catch(() => {});
          } else if (contentNode) {
            // in a custom context, launch or maintain overlay
            this.currentContent = contentNode;
            this.overlayIsOpen = true;
            context.node_id = contentNode.id;
            context.customChannel = true;
            const encodedContext = encodeURI(JSON.stringify(context));
            router.replace({ query: { context: encodedContext } }).catch(() => {});
          }
          this.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        });
      },
      getOrUpdateContext(message) {
        // to update context with the incoming context
        if (message.context) {
          message.context.customChannel = message.context.customChannel || true;
          const encodedContext = encodeURI(JSON.stringify(message.context));
          router.push({ query: { context: encodedContext } }).catch(() => {});
          this.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        } else {
          // just return the existing query
          const urlParams = this.$route.query;
          const fetchedEncodedContext = urlParams.has('context')
            ? urlParams.get('context')
            : this.context;
          message.context = decodeURI(JSON.stringify(fetchedEncodedContext));
          this.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .fullscreen-header {
    text-align: right;
  }

  .fs-icon {
    position: relative;
    top: 8px;
    width: 24px;
    height: 24px;
  }

  .html5-renderer {
    position: relative;
    text-align: center;
  }

  .iframe {
    width: 100%;
    height: 100%;
  }

  .iframe-container {
    @extend %momentum-scroll;

    width: 100%;
    overflow: visible;
  }

</style>
