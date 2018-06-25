<template>

  <!-- TODO if not breaking up into child components, use single .vue file -->

  <div>
    <!-- IDEA -a11y- add an invisible title entry in the dl below? -->
    <!-- h1's are technically not allowed within a dl -->
    <h1 class="header primary-data">
      {{ content.title }}
    </h1>
    <coach-content-label
      :value="content.num_coach_contents"
      :isTopic="false"
    />

    <dl>
      <div class="primary-data" v-if="completionRequirements">
        <dt>{{ $tr('completionModelDataHeader') }}</dt>
        <dd>
          {{ completionRequirements }}
        </dd>
      </div>

      <div class="primary-data" v-if="description">
        <dt class="visuallyhidden">
          {{ $tr('descriptionDataHeader') }}
        </dt>
        <!-- HTML for markdown -->
        <dd v-html="description" dir="auto" class="description"></dd>
      </div>

      <div class="secondary-data" v-if="author">
        <dt>{{ $tr('authorDataHeader') }}</dt>
        <dd>
          <!-- single-quote wrapped user strings, per indirectlylit -->
          '{{ author }}'
        </dd>
      </div>

      <div class="secondary-data" v-if="license">
        <dt>{{ $tr('licenseDataHeader') }}</dt>
        <dd>
          '{{ license }}'
          <info-icon
            v-if="licenseInfo"
            tooltipPosition="right middle"
            :tooltipText="licenseInfo"
            :iconAriaLabel="licenseInfo"
          />
        </dd>
      </div>

      <div class="secondary-data" v-if="copyrightHolder">
        <dt>{{ $tr('copyrightHolderDataHeader') }}</dt>
        <dd>
          '{{ copyrightHolder }}'
        </dd>
      </div>
    </dl>
  </div>

</template>


<script>

  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import InfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import markdownIt from 'markdown-it';

  const dataRequired = ['title'];
  const completionDataRequired = ['m', 'n'];

  export default {
    name: 'metadataArea',
    $trs: {
      completionModelDataHeader: 'Completion',
      completionRequirements: '{correct, number} out of {total, number} correct',
      descriptionDataHeader: 'Description',
      authorDataHeader: 'Author',
      licenseDataHeader: 'License',
      copyrightHolderDataHeader: 'Copyright holder',
    },
    components: {
      coachContentLabel,
      InfoIcon,
    },
    props: {
      content: {
        type: Object,
        required: true,
        validator(content) {
          // confirm with designers
          return dataRequired.every(key => content[key]);
        },
      },
      completionData: {
        type: Object,
        required: false,
        validator(data) {
          if (data) {
            // confirm with Richard. Currently, only accepts m_of_n types
            return completionDataRequired.every(key => data[key]);
          }
          return true;
        },
      },
    },
    computed: {
      completionRequirements() {
        if (this.completionData) {
          const { m: correct, n: total } = this.completionData;
          return this.$tr('completionRequirements', { correct, total });
        }
        return false;
      },
      description() {
        if (this.content) {
          const md = new markdownIt('zero', { breaks: true });
          return md.render(this.content.description);
        }
      },
      author() {
        return this.content.author;
      },
      license() {
        return this.content.license_name;
      },
      licenseInfo() {
        return this.content.license_description;
      },
      copyrightHolder() {
        return this.content.license_owner;
      },
    },
  };

</script>


<style scoped lang="stylus">

  $standard-data-spacing = 8px

  .header
    margin-top: 0
    font-size: 28px // bumping half an increment
    text-align: left

  .primary-data
    margin-bottom: $standard-data-spacing * 2

  .secondary-data
    margin-bottom: $standard-data-spacing
    font-size: 12px // bumping half an increment, 8 way too small

  dt, dd
    display: inline-block
    margin: 0

  dt
    &:not(.visuallyhidden):after
      content: ':'
  dd
    &:not(.description)
      margin-left: 8px

  .description
    >>>p
      margin: 0

</style>
