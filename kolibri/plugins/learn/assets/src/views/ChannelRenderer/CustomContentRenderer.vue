<template>

  <div class="iframe-container">
    <iframe
      ref="iframe"
      class="iframe"
      sandbox="allow-scripts allow-same-origin"
      :style="{ backgroundColor: $themePalette.grey.v_200 }"
      frameBorder="0"
      :src="rooturl"
    >
    </iframe>
    <ContentModal
      v-if="overlayIsOpen"
      :key="currentContent.id"
      :contentNode="currentContent"
      :channelTheme="channelTheme"
      @close="overlayIsOpen = false"
    />
  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import urls from 'kolibri/urls';
  import Hashi from 'hashi';
  import { now } from 'kolibri/utils/serverClock';
  import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import ContentNodeSearchResource from 'kolibri-common/apiResources/ContentNodeSearchResource';
  import router from 'kolibri/router';
  import { ContentNodeKinds } from 'kolibri/constants';
  import { events, MessageStatuses } from 'hashi/src/hashiBase';
  import useChannels from 'kolibri-common/composables/useChannels';
  import { validateChannelTheme } from '../../utils/validateChannelTheme';
  import useContentLink from '../../composables/useContentLink';
  import ContentModal from './ContentModal';

  const { channelsMap } = useChannels();

  function createReturnMsg({ message, data, err }) {
    // Infer status from data or err
    const status = data ? MessageStatuses.SUCCESS : MessageStatuses.FAILURE;
    return {
      nameSpace: 'hashi',
      event: events.DATARETURNED,
      data: {
        message_id: message.message_id,
        type: 'response',
        data: data || null,
        err: err || null,
        status,
      },
    };
  }

  export default {
    name: 'CustomContentRenderer',
    components: {
      ContentModal,
    },
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      return { genContentLinkBackLinkCurrentPage };
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
      currentChannel() {
        return get(channelsMap)[this.topic.channel_id];
      },
    },
    mounted() {
      this.hashi = new Hashi({ iframe: this.$refs.iframe, now });
      const zipFile = this.topic.files.find(f => f.extension === 'zip');
      this.hashi.on(events.COLLECTIONREQUESTED, message => {
        this.fetchContentCollection(message);
      });
      this.hashi.on(events.COLLECTIONPAGEREQUESTED, message => {
        this.fetchMore(message);
      });
      this.hashi.on(events.MODELREQUESTED, message => {
        this.fetchContentModel.call(this, message);
      });
      this.hashi.on(events.NAVIGATETO, message => {
        this.navigateTo.call(this, message);
      });
      this.hashi.on(events.CONTEXT, message => {
        this.getOrUpdateContext.call(this, message);
      });
      this.hashi.on(events.THEMECHANGED, message => {
        this.updateTheme.call(this, message);
      });
      this.hashi.on(events.SEARCHRESULTREQUESTED, message => {
        this.fetchSearchResult.call(this, message);
      });
      this.hashi.on(events.KOLIBRIVERSIONREQUESTED, message => {
        this.sendKolibriVersion.call(this, message);
      });
      this.hashi.on(events.CHANNELMETADATAREQUESTED, message => {
        this.sendChannelMetadata.call(this, message);
      });
      this.hashi.on(events.CHANNELFILTEROPTIONSREQUESTED, message => {
        this.sendChannelFilterOptions.call(this, message);
      });
      this.hashi.on(events.RANDOMCOLLECTIONREQUESTED, message => {
        this.sendRandomCollection.call(this, message);
      });
      this.hashi.initialize(
        {},
        {},
        urls.zipContentUrl(zipFile.checksum, zipFile.extension, 'index.html'),
        zipFile.checksum,
      );
    },
    methods: {
      // helper functions for fetching data from kolibri
      // called in mainClient.js
      fetchContentCollection(message) {
        const { options } = message;
        const { kinds, onlyContent, onlyTopics } = options;

        if (onlyContent && onlyTopics) {
          const err = new Error('onlyContent and onlyTopics can not be used at the same time');
          return createReturnMsg({ message, err });
        }
        const kind = onlyContent ? 'content' : onlyTopics ? ContentNodeKinds.TOPIC : undefined;

        // limit to channel, defaults to true
        const limitToChannel = 'limitToChannel' in options ? options.limitToChannel : true;

        return ContentNodeResource.fetchCollection({
          getParams: {
            ids: options.ids,
            authors: options.authors,
            tags: options.tags,
            parent: options.parent === 'self' ? this.topic.id : options.parent,
            channel_id: limitToChannel ? this.topic.channel_id : undefined,
            max_results: options.maxResults ? options.maxResults : 50,
            kind: kind,
            kind_in: kinds,
            descendant_of: options.descendantOf,
          },
        })
          .then(contentNodes => {
            const { more, results } = contentNodes;

            return createReturnMsg({
              message,
              data: {
                maxResults: options.maxResults ? options.maxResults : 50,
                more,
                results,
              },
            });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendMessage(newMsg);
          });
      },

      fetchMore(message) {
        const { options } = message;

        return ContentNodeResource.fetchCollection({
          getParams: options,
        })
          .then(contentNodes => {
            const { more, results } = contentNodes;

            return createReturnMsg({
              message,
              data: {
                maxResults: options.max_results ? options.max_results : 50,
                more,
                results,
              },
            });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendMessage(newMsg);
          });
      },

      fetchContentModel(message) {
        return ContentNodeResource.fetchModel({ id: message.id })
          .then(contentNode => {
            return createReturnMsg({ message, data: contentNode });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendMessage(newMsg);
          });
      },

      fetchSearchResult(message) {
        let searchPromise;
        const { options } = message;
        const { keyword } = options;
        if (!keyword) {
          searchPromise = Promise.resolve({
            maxResults: 0,
            results: [],
          });
        } else {
          // limit to channel, defaults to true
          const limitToChannel = 'limitToChannel' in options ? options.limitToChannel : true;
          searchPromise = ContentNodeSearchResource.fetchCollection({
            getParams: {
              search: keyword,
              channel_id: limitToChannel ? this.topic.channel_id : undefined,
              max_results: options.maxResults ? options.maxResults : 50,
            },
          }).then(searchResults => {
            return {
              maxResults: options.maxResults ? options.maxResults : 50,
              more: searchResults.more,
              results: searchResults.results,
            };
          });
        }

        return searchPromise
          .then(pageResult => {
            return createReturnMsg({ message, data: pageResult });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendMessage(newMsg);
          });
      },

      navigateTo(message) {
        const id = message.nodeId;
        const context = {};
        return ContentNodeResource.fetchModel({ id })
          .then(contentNode => {
            if (contentNode && contentNode.kind === 'topic') {
              router.push(
                this.genContentLinkBackLinkCurrentPage(contentNode.id, contentNode.is_leaf),
              );
            } else if (contentNode && this.overlayIsOpen == false) {
              // in a custom context, launch overlay
              this.currentContent = contentNode;
              this.overlayIsOpen = true;
              context.node_id = contentNode.id;
              context.customChannel = true;
              const encodedContext = encodeURI(JSON.stringify(context));
              router.replace({ query: { context: encodedContext } }).catch(() => {});
            } else if (contentNode && this.overlayIsOpen == true) {
              // in a custom context, within an overlay, switch the overlay
              // content to the new content
              this.currentContent = contentNode;
              context.node_id = contentNode.id;
              context.customChannel = true;
              this.$forceUpdate();
              const encodedContext = encodeURI(JSON.stringify(context));
              router.replace({ query: { context: encodedContext } }).catch(() => {});
            }
            return createReturnMsg({ message, data: {} });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendLocalMessage(newMsg);
          });
      },
      getOrUpdateContext(message) {
        // to update context with the incoming context
        if (message.context) {
          message.context.customChannel = message.context.customChannel || true;
          const encodedContext = encodeURI(JSON.stringify(message.context));
          router.push({ query: { context: encodedContext } }).catch(() => {});
        } else {
          // just return the existing query
          const urlParams = this.$route.query;
          const fetchedEncodedContext = urlParams.context || this.context;
          message.context = decodeURI(JSON.stringify(fetchedEncodedContext));
        }

        const newMsg = createReturnMsg({ message, data: {} });
        this.hashi.mediator.sendLocalMessage(newMsg);
      },
      updateTheme(message) {
        const themeCopy = { ...message };
        delete themeCopy.message_id;
        this.channelTheme = validateChannelTheme(themeCopy);
        const newMsg = createReturnMsg({ message, data: {} });
        return this.hashi.mediator.sendMessage(newMsg);
      },
      sendKolibriVersion(message) {
        const newMsg = createReturnMsg({ message, data: __version });
        return this.hashi.mediator.sendMessage(newMsg);
      },
      sendChannelMetadata(message) {
        const newMsg = createReturnMsg({ message, data: this.currentChannel });
        return this.hashi.mediator.sendMessage(newMsg);
      },
      sendChannelFilterOptions(message) {
        return ChannelResource.fetchFilterOptions(this.topic.channel_id)
          .then(response => {
            return createReturnMsg({
              message,
              data: {
                availableAuthors: response.data.available_authors,
                availableTags: response.data.available_tags,
                availableKinds: response.data.available_kinds,
              },
            });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendMessage(newMsg);
          });
      },
      sendRandomCollection(message) {
        const { options } = message;
        const { kinds, onlyContent } = options;

        // limit to channel, defaults to true
        const limitToChannel = 'limitToChannel' in options ? options.limitToChannel : true;

        return ContentNodeResource.fetchRandomCollection({
          getParams: {
            parent: options.parent === 'self' ? this.topic.id : options.parent,
            channel_id: limitToChannel ? this.topic.channel_id : undefined,
            max_results: options.maxResults ? options.maxResults : 10,
            kind: onlyContent ? 'content' : undefined,
            kind_in: kinds,
            // Time seed to avoid cache
            seed: Date.now().toString(),
          },
        })
          .then(contentNodes => {
            return createReturnMsg({
              message,
              data: {
                maxResults: options.maxResults ? options.maxResults : 10,
                results: contentNodes.results,
              },
            });
          })
          .catch(err => {
            return createReturnMsg({ message, err });
          })
          .then(newMsg => {
            this.hashi.mediator.sendMessage(newMsg);
          });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

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

    position: absolute;
    top: 64px;
    left: 0;
    width: 100%;
    height: calc(100% - 64px);
    overflow: visible;
  }

</style>
