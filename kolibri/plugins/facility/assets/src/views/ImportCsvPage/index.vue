<template>

  <KPageContainer>

    <h1>{{ $tr('pageHeader') }}</h1>

    <Init
      v-if="state === 'INIT'"
      @cancel="done"
      @next="preview"
    />
    <Preview
      v-else-if="state === 'PREVIEW'"
      @cancel="done"
      @next="startImport"
    />
    <Preview
      v-else-if="state === 'RESULTS'"
      isFinal
      @next="done"
    />
    <template
      v-else-if="state === 'IN_PROGRESS'"
    >
      <KCircularLoader style="margin: 32px" />
    </template>

  </KPageContainer>

</template>


<script>

  import Init from './Init';
  import Preview from './Preview';

  export default {
    name: 'ImportCsvPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader'),
      };
    },
    components: {
      Init,
      Preview,
    },
    data() {
      return {
        state: 'INIT',
      };
    },
    methods: {
      preview(fileToImport) {
        console.log('preview >>>>', fileToImport);
        this.state = 'IN_PROGRESS';
        setTimeout(() => {
          this.state = 'PREVIEW';
        }, 2000);
      },
      startImport(alsoDelete) {
        console.log('startImport >>>>', alsoDelete);
        this.state = 'IN_PROGRESS';
        setTimeout(() => {
          this.state = 'RESULTS';
        }, 2000);
      },
      done() {
        this.$router.push(this.$router.getRoute('DATA_PAGE'));
      },
    },
    $trs: {
      pageHeader: 'Import users',
    },
  };

</script>


<style lang="scss" scoped>

  .caution {
    font-weight: bold;
    color: red;
  }

</style>
