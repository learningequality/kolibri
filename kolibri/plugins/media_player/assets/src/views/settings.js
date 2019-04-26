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

  set showTranscript(showTranscript) {
    return this.save({ showTranscript });
  }

  get showTranscript() {
    return this.get().showTranscript;
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
