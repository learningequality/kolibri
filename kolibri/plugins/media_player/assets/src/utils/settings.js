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
    this.save({ playerMuted });
  }

  get playerMuted() {
    return this.get().playerMuted;
  }

  set playerRate(playerRate) {
    this.save({ playerRate });
  }

  get playerRate() {
    return this.get().playerRate;
  }

  set playerVolume(playerVolume) {
    this.save({ playerVolume });
  }

  get playerVolume() {
    return this.get().playerVolume;
  }

  set captionLanguage(captionLanguage) {
    this.save({ captionLanguage });
  }

  get captionLanguage() {
    return this.get().captionLanguage;
  }

  set captionSubtitles(captionSubtitles) {
    this.save({ captionSubtitles });
  }

  get captionSubtitles() {
    return this.get().captionSubtitles;
  }

  set captionTranscript(captionTranscript) {
    this.save({ captionTranscript });
  }

  get captionTranscript() {
    return this.get().captionTranscript;
  }

  set videoLangCode(videoLangCode) {
    this.save({ videoLangCode });
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
