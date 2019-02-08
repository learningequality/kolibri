import {
  ContentNodeSlimResource,
  ContentNodeResource,
  ContentNodeProgressResource,
} from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import { PageNames } from '../../constants';
import { _collectionState, normalizeContentNode, contentState } from '../coreLearn/utils';

export function showTopicsChannel(store, id) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', PageNames.TOPICS_CHANNEL);
    return showTopicsTopic(store, { id, isRoot: true });
  });
}

export function showTopicsContent(store, id) {
  store.commit('SET_EMPTY_LOGGING_STATE');
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.TOPICS_CONTENT);

  const promises = [
    ContentNodeResource.fetchModel({ id }),
    ContentNodeResource.fetchNextContent(id),
    ContentNodeSlimResource.fetchAncestors(id),
    store.dispatch('setChannelInfo'),
  ];
  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([content, nextContent, ancestors]) => {
      const currentChannel = store.getters.getChannelObject(content.channel_id);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      store.commit('topicsTree/SET_STATE', {
        content: contentState(content, nextContent, ancestors),
        channel: currentChannel,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}

export function showTopicsTopic(store, { id, isRoot = false }) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', isRoot ? PageNames.TOPICS_CHANNEL : PageNames.TOPICS_TOPIC);
    const include_fields = [];
    if (store.getters.isCoach || store.getters.isAdmin) {
      include_fields.push('num_coach_contents');
    }
    const promises = [
      ContentNodeResource.fetchModel({ id }), // the topic
      ContentNodeSlimResource.fetchCollection({
        getParams: {
          parent: id,
          by_role: true,
          include_fields,
        },
      }), // the topic's children
      ContentNodeSlimResource.fetchAncestors(id), // the topic's ancestors
      store.dispatch('setChannelInfo'),
    ];

    return ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([topic, children, ancestors]) => {
        const currentChannel = store.getters.getChannelObject(topic.channel_id);
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }
        if (isRoot) {
          topic.description = currentChannel.description;
        }
        store.commit('topicsTree/SET_STATE', {
          isRoot,
          channel: currentChannel,
          topic: normalizeContentNode(topic, ancestors),
          contents: _collectionState(children),
        });

        // Only load contentnode progress if the user is logged in
        if (store.getters.isUserLoggedIn) {
          const contentNodeIds = children.map(({ id }) => id);

          if (contentNodeIds.length > 0) {
            ContentNodeProgressResource.fetchCollection({
              getParams: { ids: contentNodeIds },
            }).then(progresses => {
              store.commit('topicsTree/SET_NODE_PROGRESS', progresses);
            });
          }
        }

        store.dispatch('notLoading');
        store.commit('CORE_SET_ERROR', null);
      },
      error => {
        store.dispatch('handleApiError', error);
      }
    );
  });
}

export function showKnowledgeMap(store, id, isRoot = false) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', PageNames.KNOWLEDGE_MAP);
    const include_fields = [];
    if (store.getters.isCoach || store.getters.isAdmin) {
      include_fields.push('num_coach_contents');
    }
    console.log('channel id:', id);
    const promises = [
      ContentNodeResource.fetchModel({ id }), // the topic
      ContentNodeSlimResource.fetchCollection({
        getParams: {
          parent: id,
          by_role: true,
          include_fields,
        },
      }), // the topic's children
      ContentNodeSlimResource.fetchAncestors(id), // the topic's ancestors
      store.dispatch('setChannelInfo'),
    ];

    return ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([topic, children, ancestors]) => {
        /////////////////////////////////////////
        // console.log('topic:', topic, 'children', children, 'ancestors', ancestors);
        // console.log('ch before before:', children);
        const childrenPromises = children.map(c =>
          ContentNodeSlimResource.fetchCollection({
            getParams: {
              parent: c.id,
              by_role: true,
              include_fields,
            },
          })
        );
        // console.log('ch before:', children);
        Promise.all(childrenPromises).then(
          childrenChildren => {
            console.log('chCh:', JSON.parse(JSON.stringify(childrenChildren)));
            let allIds = [];
            for (let i = 0; i < children.length; ++i) {
              // console.log('ch ch i:', childrenChildren[i]);
              children[i].children = childrenChildren[i];
              // for (let j = 0; j < childrenChildren[i].length; ++j) {
              //   childrenChildren[i][j] = normalizeContentNode(childrenChildren[i][j]);
              // }
              children[i].children = _collectionState(childrenChildren[i]);
              allIds = [...allIds, ...children[i].children.map(({ id }) => id)];
            }
            console.log({ allIds });

            function findChildById(id) {
              for (let i = 0; i < childrenChildren.length; ++i) {
                let child = childrenChildren[i].find(child => child.id == id);
                if (typeof child !== 'undefined') {
                  console.log({ id, child });
                  return child;
                }
              }
            }

            if (store.getters.isUserLoggedIn) {
              const contentNodeIds = allIds;

              if (contentNodeIds.length > 0) {
                ContentNodeProgressResource.fetchCollection({
                  getParams: { ids: contentNodeIds },
                }).then(progresses => {
                  console.log(progresses, 'progresses all');
                  progresses.forEach(p =>
                    Vue.set(findChildById(p.id), 'progress', p.progress_fraction)
                  );
                  // store.commit('topicsTree/SET_NODE_PROGRESS', progresses);
                });
              }
            }

            // console.log('ch after:', JSON.stringify(children, null, 2));
            // ///////////////buvo apacioj
            const currentChannel = store.getters.getChannelObject(topic.channel_id);

            if (!currentChannel) {
              router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
              return;
            }
            if (isRoot) {
              topic.description = currentChannel.description;
            }
            console.log('ancestors');
            if (store.getters.isUserLoggedIn) {
              ContentNodeProgressResource.fetchCollection({
                getParams: { ids: [id] },
              }).then(progresses => {
                console.log('--- toplevel: ', progresses);
                console.log('www', progresses[0].progress_fraction);

                store.commit('topicsTree/SET_STATE', {
                  isRoot,
                  channel: currentChannel,
                  topic: normalizeContentNode(topic, ancestors),
                  contents: _collectionState(children),
                  progress: progresses[0].progress_fraction,
                });
              });
            }

            // Only load contentnode progress if the user is logged in
            if (store.getters.isUserLoggedIn) {
              const contentNodeIds = children.map(({ id }) => id);
              console.log('--- ids: ', contentNodeIds);

              if (contentNodeIds.length > 0) {
                ContentNodeProgressResource.fetchCollection({
                  getParams: { ids: contentNodeIds },
                }).then(progresses => {
                  console.log('--- progresses: ', progresses);
                  store.commit('topicsTree/SET_NODE_PROGRESS', progresses);
                });
              }
            }

            store.dispatch('notLoading');
            store.commit('CORE_SET_ERROR', null);
            ///////////////////////buvo apacioj
          },
          error => {
            store.dispatch('handleApiError', error);
          }
        );
      },
      error => {
        store.dispatch('handleApiError', error);
      }
    );
  });
}
