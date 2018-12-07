import KolibriModule from 'kolibri_module';

export default class ContentRenderer extends KolibriModule {
  get rendererComponent() {
    return null;
  }
  get contentTypes() {
    return null;
  }
  loadDirectionalCSS(direction) {
    return this.Kolibri.loadDirectionalCSS(this, direction);
  }
}
