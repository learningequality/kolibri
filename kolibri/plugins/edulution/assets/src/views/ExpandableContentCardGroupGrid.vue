<template>

  <div class="collapsible-grid">
    <div 
      class="clickable-header"
      :style="{ backgroundColor: $coreActionNormal }"
      :class="{'expanded-header': !hidden}"
      @click="hidden = !hidden"
    >
      <PageHeader :title="child.title" :progress="child.progress" style="display: inline-block" />
      <UiIconButton type="secondary" size="large" class="topic-arrow" disabled>
        <mat-svg v-if="!hidden" name="expand_less" category="navigation" />
        <mat-svg v-else name="expand_more" category="navigation" />
      </UiIconButton>
    </div>
    <div :class="{'hidden-grid': hidden}">
      <ContentCardGroupGrid
        v-if="child.children.length"
        :contents="child.children"
        :genContentLink="genContentLink"
        style="padding-left: 16px; padding-top: 16px"
      />
    </div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { PageNames } from '../constants';
  import PageHeader from './PageHeader';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'ExpandableContentCardGroupGrid',
    components: {
      PageHeader,
      ContentCardGroupGrid,
      UiIconButton,
    },
    mixins: [themeMixin],
    props: { child: Object },
    data() {
      return {
        hidden: false,
      };
    },
    methods: {
      genContentLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.KNOWLEDGE_MAP,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.TOPICS_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
  };

</script>


<style lang="scss">

  .collapsible-grid {
    margin-bottom: 8px;
    overflow: auto;
    border-radius: 8px;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .clickable-header {
    padding-left: 16px;
    color: white;
    border-radius: 8px;
  }

  .expanded-header {
    border-radius: 8px 8px 0 0;
  }

  .hidden-grid {
    display: none;
  }

  .topic-arrow {
    float: right;
    margin: 8px 8px 0 0;
  }

</style>
