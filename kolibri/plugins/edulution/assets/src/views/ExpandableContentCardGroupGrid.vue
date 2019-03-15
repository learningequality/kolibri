<template>

  <div>
    <div class="collapsible-header" @click="hidden = !hidden">
      <PageHeader :title="child.title" :progress="child.progress" style="display: inline-block" />
      <UiIconButton type="secondary" size="large" style="float: right; margin: 8px" disabled>
        <mat-svg v-if="!hidden" name="expand_less" category="navigation" />
        <mat-svg v-else name="expand_more" category="navigation" />
      </UiIconButton>
      <ContentCardGroupGrid
        v-if="child.children.length"
        :contents="child.children"
        :genContentLink="genContentLink"
        :class="{ 'hidden-grid': hidden}"
      />
    </div>
  </div>

</template>

<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import UiIconButton from 'keen-ui/src/UiIconButton';
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

<style>
  .collapsible-header {
    border-radius: 8px;
    padding-left: 16px;
    margin-bottom: 8px;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2),
    0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .hidden-grid {
    display: none;
  }
</style>
