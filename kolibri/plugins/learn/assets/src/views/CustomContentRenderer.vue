<template>

  <CoreFullscreen
    ref="html5Renderer"
    class="html5-renderer"
    :style="{ height: contentRendererHeight, width: iframeWidth }"
    @changeFullscreen="isInFullscreen = $event"
  >

    <div
      class="fullscreen-header"
      :style="{ backgroundColor: this.$themePalette.grey.v_100 }"
    >
      <KButton
        :primary="false"
        appearance="flat-button"
        @click="$refs.html5Renderer.toggleFullscreen()"
      >
        <KIcon
          v-if="isInFullscreen"
          icon="fullscreen_exit"
          class="fs-icon"
        />
        <KIcon
          v-else
          icon="fullscreen"
          class="fs-icon"
        />
        {{ fullscreenText }}
      </KButton>
    </div>
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
    </div>
  </CoreFullscreen>

</template>


<script>

  import pick from 'lodash/pick';
  import urls from 'kolibri.urls';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import Hashi from 'hashi';
  import { now } from 'kolibri.utils.serverClock';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import { events } from 'hashi/src/hashiBase';

  const defaultContentHeight = '500px';
  const frameTopbarHeight = '37px';
  const pxStringAdd = (x, y) => parseInt(x, 10) + parseInt(y, 10) + 'px';

  export default {
    name: 'CustomContentRenderer',
    components: {
      CoreFullscreen,
    },
    props: {
      topic: {
        type: Object,
        required: true,
      },
    },
    // data() {
    //   return {
    //     open: false,
    //   };
    // },
    computed: {
      context() {
        const urlParams = new URLSearchParams(window.location.search);
        const fetchedEncodedContext = urlParams.has('context')
          ? urlParams.get('context')
          : { context: { customChannel: true } };
        return decodeURI(fetchedEncodedContext);
      },
      rooturl() {
        console.log(urls.hashi());
        return urls.hashi();
      },
      iframeHeight() {
        return (this.options && this.options.height) || defaultContentHeight;
      },
      iframeWidth() {
        return (this.options && this.options.width) || 'auto';
      },
      contentRendererHeight() {
        return pxStringAdd(this.iframeHeight, frameTopbarHeight);
      },
      fullscreenText() {
        return this.isInFullscreen ? this.$tr('exitFullscreen') : this.$tr('enterFullscreen');
      },
      containerStyle() {
        if (this.isInFullscreen) {
          return {
            position: 'absolute',
            top: frameTopbarHeight,
            bottom: 0,
          };
        }
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
        this.fetchContentModel(message);
      });
      this.hashi.on('navigateto', message => {
        this.navigateTo(message);
      });
      this.hashi.on('context', message => {
        this.getOrUpdateContext(message);
      });
      console.log(this.hashi);
    },
    methods: {
      // helper functions for fetching data from kolibri
      // called in mainClient.js

      fetchContentCollection(message) {
        console.log('fetching content collection');
        const options = message.options;
        const getParams = pick(options, ['ids', 'parent']);
        if (options.parent && options.parent == 'self') {
          getParams.parent = this.topic.id;
        }
        let self = this;
        ContentNodeResource.fetchCollection({ getParams }).then(contentNodes => {
          contentNodes ? (message.status = 'success') : (message.status = 'failure');
          let response = {};
          response.page = message.options.page ? message.options.page : 1;
          response.pageSize = message.options.pageSize ? message.options.pageSize : 50;
          response.results = contentNodes;
          message.data = response;
          console.log('response', response);
          message.type = 'response';
          self.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        });
      },

      fetchContentModel(message) {
        let id = message.id;
        let self = this;
        ContentNodeResource.fetchModel({ id }).then(contentNode => {
          if (contentNode) {
            message.status = 'success';
          } else {
            message.status = 'failure';
          }
          message.data = contentNode;
          message.type = 'response';
          self.hashi.mediator.sendMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        });
      },

      navigateTo(message) {
        let id = message.nodeId;
        let self = this;
        ContentNodeResource.fetchModel({ id }).then(contentNode => {
          let routeBase, path;
          if (contentNode && contentNode.kind === 'topic') {
            routeBase = '/topics/t';
            path = `${routeBase}/${id}`;
            router.push({ path: path }).catch(() => {});
          } else if (contentNode) {
            // in a custom context, launch or maintain overlay
            self.currentContent = contentNode;
            // self.open = true;
          }
          self.hashi.mediator.sendLocalMessage({
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
          const encodedContext = this.encodeContext(message.context);
          router.push({ query: { context: encodedContext } }).catch(() => {});
          self.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        } else {
          // just return the existing query
          const urlParams = new URLSearchParams(window.location.search);
          const fetchedEncodedContext = urlParams.has('context')
            ? urlParams.get('context')
            : this.context;
          message.context = decodeURI(fetchedEncodedContext);
          self.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: events.KOLIBRIDATARETURNED,
            data: message,
          });
        }
      },
    },
    $trs: {
      exitFullscreen: 'Exit Fullscreen',
      enterFullscreen: 'View Fullscreen',
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
