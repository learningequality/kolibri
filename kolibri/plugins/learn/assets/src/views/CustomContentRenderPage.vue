<template>

  <div>
    <KContentRenderer
      ref="customiframe"
      class="content-renderer"
      :kind="currentContent.kind"
      :lang="currentContent.lang"
      :files="currentContent.files"
      :options="currentContent.options"
    />
  </div>

</template>


<script>

  import pick from 'lodash/pick';
  import { ContentNodeResource } from 'kolibri.resources';
  import Hashi from 'hashi';

  export default {
    name: 'CustomContentRenderPage',
    props: {
      content: {
        type: Object,
        required: true,
      },
      node: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        currentContent: this.content,
      };
    },
    mounted() {
      this.hashi = new Hashi({ iframe: this.$refs.customiframe });
      this.hashi.on('kolibridatarequested', message => {
        this.fetchContentCollection(message);
      });
      // this.hashi.fetchContentCollection = this.fetchContentCollection.bind(this);
      // this.hashi.fetchContentModel = this.fetchContentModel;
      // this.hashi.navigateTo = this.navigateTo;
      // this.hashi.getOrUpdateContext = this.getOrUpdateContext;
    },
    methods: {
      // helper functions for fetching data from kolibri
      // called in mainClient.js

      fetchContentCollection(message) {
        const options = message.options;
        const getParams = pick(options, ['ids', 'page', 'pageSize', 'parent']);
        if (options.parent && options.parent == 'self') {
          getParams.parent = this.node;
        }
        let self = this;
        ContentNodeResource.fetchCollection({ getParams }).then(contentNodes => {
          contentNodes ? (message.status = 'success') : (message.status = 'failure');
          let response = {};
          response.page = message.options.page ? message.options.page : 1;
          response.pageSize = message.options.pageSize ? message.options.pageSize : 50;
          response.results = contentNodes;
          message.data = response;
          message.type = 'response';
          self.hashi.mediator.sendLocalMessage({
            nameSpace: 'hashi',
            event: 'kolibridatareturned',
            data: message,
          });
        });
      },

      // fetchContentModel(message) {
      //   let id = message.id;
      //   ContentNodeResource.fetchModel({ id }).then(contentNode => {
      //     if (contentNode) {
      //       message.status = 'success';
      //     } else {
      //       message.status = 'failure';
      //     }
      //     message.data = contentNode;
      //     message.type = 'response';
      //     this.hashi.mediator.sendMessage({
      //       nameSpace: 'kolibri',
      //       event: 'datareturned',
      //       data: message,
      //     });
      //   });
      // },
      // navigateTo(message) {
      //   let id = message.nodeId;
      //   ContentNodeResource.fetchModel({ id }).then(contentNode => {
      //     let routeBase, context;
      //     const path = `${routeBase}/${id}`;
      //     if (contentNode && contentNode.kind === 'topic') {
      //       routeBase = '/topics/t';
      //       router.push({ path: path }).catch(() => {});
      //     } else if (contentNode && !message.context) {
      //       routeBase = '/topics/c';
      //       router.push({ path: path }).catch(() => {});
      //     } else if (contentNode && message.context) {
      //       // if there is custom context, launch overlay
      //       message.context.node_id = id;
      //       routeBase = '/topics/c';
      //       router
      //         .push({ path: path, query: { customContext: true, context: context } })
      //         .catch(() => {});
      //     }
      //     this.hashi.mediator.sendMessage({
      //       nameSpace,
      //       event: events.DATARETURNED,
      //       data: message,
      //     });
      //   });
      // },
      // getOrUpdateContext(message) {
      //   // to update context with the incoming context
      //   if (message.context) {
      //     const encodedContext = this.encodeContext(message.context);
      //     router.push({ query: { context: encodedContext } }).catch(() => {});
      //   } else {
      //     // just return the existing query
      //     const urlParams = new URLSearchParams(window.location.search);
      //     const fetchedEncodedContext =
      //        urlParams.has('context') ? urlParams.get('context') : null;
      //     return decodeURI(fetchedEncodedContext);
      //   }
      // },
    },
  };

</script>


<style lang="scss" scoped>

  .content-renderer {
    // Needs to be one less than the ScrollingHeader's z-index of 4
    z-index: 3;
  }

  .coach-content-label {
    margin: 8px 0;
  }

  .metadata {
    font-size: smaller;
  }

  .download-button,
  .share-button {
    display: inline-block;
    margin: 16px 16px 0 0;
  }

  .license-details {
    margin-bottom: 24px;
    margin-left: 16px;
  }

  .license-details-name {
    font-weight: bold;
  }

</style>
