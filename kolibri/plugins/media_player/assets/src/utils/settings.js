import Lockr from 'lockr';

const MEDIA_PLAYER_SETTINGS_KEY = 'kolibriMediaPlayerSettings';

class Settings {
  constructor(defaults = {}) {
    this._defaults = defaults;

    // `videoLangCode` predates `captionLanguage` code, so migrate it
    if (this.videoLangCode && this.videoLangCode !== this.captionLanguage) {
      this.captionLanguage = this.videoLangCode;
      this.videoLangCode = null;
    }
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

  set captionLanguage(captionLanguage) {
    return this.save({ captionLanguage });
  }

  get captionLanguage() {
    return this.get().captionLanguage;
  }

  set captionSubtitles(captionSubtitles) {
    return this.save({ captionSubtitles });
  }

  get captionSubtitles() {
    return this.get().captionSubtitles;
  }

  set captionTranscript(captionTranscript) {
    return this.save({ captionTranscript });
  }

  get captionTranscript() {
    return this.get().captionTranscript;
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
