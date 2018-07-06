<template>

  <div>
    <div class="lesson-summary-header">
      <div class="lesson-summary-header-title-block">
        <content-icon
          :kind="kind"
          class="title-lesson-icon"
        />
        <h1 class="lesson-summary-header-title">
          {{ title }}
        </h1>
      </div>
      <slot name="optionsDropdown"></slot>
    </div>

    <dl>
      <dt>
        {{ $tr('status') }}
        <core-info-icon
          :iconAriaLabel="$tr('statusDescription')"
          :tooltipText="$tr('statusTooltipText')"
          tooltipPosition="bottom left"
        />
      </dt>
      <dd>
        <status-icon :active="active" />
        <k-button
          appearance="basic-link"
          class="change-status-button"
          :text="$tr('changeStatus')"
          @click="$emit('changeStatus')"
        />
      </dd>

      <template v-if="showDescription">
        <dt>
          {{ $tr('description') }}
        </dt>
        <dd>
          {{ description || $tr('noDescription') }}
        </dd>
      </template>

      <dt>
        {{ $tr('recipients') }}
      </dt>
      <dd>
        <template v-if="!recipients.length">
          {{ this.$tr('noOne') }}
        </template>
        <template v-else-if="classIsTheRecipient">
          {{ this.$tr('entireClass') }}
        </template>
        <ul
          v-else
          class="group-list"
        >
          <li
            class="group-list-item"
            v-for="recipientGroup in recipientGroups"
            :key="recipientGroup.id"
          >
            <span>{{ recipientGroup.name }}</span>
          </li>
        </ul>
      </dd>
    </dl>

  </div>

</template>


<script>

  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import StatusIcon from './StatusIcon';

  export default {
    name: 'assignmentSummary',
    components: {
      CoreInfoIcon,
      contentIcon,
      StatusIcon,
      kButton,
    },
    props: {
      kind: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      active: {
        type: Boolean,
        required: true,
      },
      description: {
        type: String,
        required: false,
        default: null,
      },
      recipients: {
        type: Array,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      status: 'Status',
      statusDescription: 'Status description',
      statusTooltipText: 'Active: visible to learners. Inactive: hidden from learners.',
      changeStatus: 'Change',
      description: 'Description',
      noDescription: 'No description',
      recipients: 'Recipients',
      noOne: 'No one',
      entireClass: 'Entire class',
    },
    computed: {
      showDescription() {
        return this.description !== null;
      },
      normalizedRecipients() {
        return this.recipients.map(recipient => {
          return Object.assign({}, recipient, {
            collection_id:
              recipient.collection_id || recipient.collection.id || recipient.collection,
            collection_kind: recipient.collection_kind || recipient.collection.kind,
          });
        });
      },
      classIsTheRecipient() {
        return (
          this.normalizedRecipients.length === 1 &&
          this.normalizedRecipients[0].collection_kind === CollectionKinds.CLASSROOM
        );
      },
      recipientGroups() {
        return this.normalizedRecipients
          .filter(recipient => recipient.collection_kind === CollectionKinds.LEARNERGROUP)
          .map(recipientGroup => {
            recipientGroup.name = this.groups.find(
              lg => lg.id === recipientGroup.collection_id
            ).name;
            return recipientGroup;
          });
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  $table-header-size = 12px

  // TODO use classes
  dt
    color: $core-text-annotation // same as table header
    font-size: $table-header-size
    margin-top: 16px
    margin-bottom: 8px

  dd
    margin-left: 0
    margin-bottom: 1.5em

  .group-list
    margin: 0
    padding: 0
    &-item
      margin: 0
      list-style: none
      display: inline
      &:not(:last-child)::after
        content: ', '

  .title-lesson-icon
    display: inline-block
    font-size: 1.8em
    margin-right: 0.5em
    >>>.ui-icon
      vertical-align: bottom

  .change-status-button
    vertical-align: sub // hack for now
    margin-left: 0.5em

  .lesson-summary-header
    display: flex
    justify-content: space-between
    align-items: center
    flex-wrap: wrap
    button
      align-self: flex-end

  .lesson-summary-header-title
    display: inline-block

</style>
