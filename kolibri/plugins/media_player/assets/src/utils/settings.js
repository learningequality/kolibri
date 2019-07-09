import Lockr from 'lockr';

const MEDIA_PLAYER_SETTINGS_KEY = 'kolibriMediaPlayerSettings';

class Settings {
  constructor(defaults = {}) {
    this._defaults = defaults;
  }

  set playerMuted(playerMuted) {
    return this.save({ playerMuted });
  }

  get playerMuted() {
    return this.get().playerMuted;
  }

  set playerRate(playerRate) {
    return this.save({ playerRate });
  }

  get playerRate() {
    return this.get().playerRate;
  }

  set playerVolume(playerVolume) {
    return this.save({ playerVolume });
  }

  get playerVolume() {
    return this.get().playerVolume;
  }

  set captionKinds(captionKinds) {
    return this.save({ captionKinds });
  }

  get captionKinds() {
    return this.get().captionKinds;
  }

  set captionLanguage(captionLanguage) {
    return this.save({ captionLanguage });
  }

  get captionLanguage() {
    return this.get().captionLanguage;
  }

  set transcriptShowing(transcriptShowing) {
    return this.save({ transcriptShowing });
  }

  get transcriptShowing() {
    return this.get().transcriptShowing;
  }

  set transcriptLangCode(transcriptLangCode) {
    return this.save({ transcriptLangCode });
  }

  get transcriptLangCode() {
    return this.get().transcriptLangCode;
  }

  set videoLangCode(videoLangCode) {
    return this.save({ videoLangCode });
  }

  get videoLangCode() {
    return this.get().videoLangCode;
  }

  get() {
    return Object.assign({}, this._defaults, Lockr.get(MEDIA_PLAYER_SETTINGS_KEY) || {});
  }

  save(updated) {
    const saved = this.get();
    Lockr.set(MEDIA_PLAYER_SETTINGS_KEY, {
      ...saved,
      ...updated,
    });
  }
}

export default Settings;
