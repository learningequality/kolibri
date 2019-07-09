import videojs from 'video.js';
import constants from '../../constants.json';
import trackUtils from '../../utils/track';
import TextTrackLanguageGroup from '../../track/textTrackLanguageGroup';
import CaptionsMenu from './captionsMenu';
import CaptionsMenuItem from './captionsMenuItem';

const TextTrackButton = videojs.getComponent('TextTrackButton');
const { handleSelectedLanguageChange } = videojs.getComponent('TextTrackMenuItem').prototype;

/**
 * The Component for the Button that will open the CaptionsMenu
 */
class CaptionsButton extends TextTrackButton {
  /**
   * @return {CaptionsMenu}
   */
  createMenu() {
    if (this.items) {
      this.items.forEach(item => item.dispose());
      this.items = [];
    }

    const menu = new CaptionsMenu(this.player(), {
      menuButton: this,
      settings: this.getSettings(),
    });

    this.hideThreshold_ = 0;

    this.items = this.createItems();
    this.items.forEach(item => menu.addItem(item));

    menu.on('show', () => {
      this.addClass('active');

      this._wasPlaying = !this.player().paused();

      // Handlers to trigger a "click" when menu should exited
      this._playListener = () => this.handleClick();
      this._blurListener = e => {
        // Don't hide the menu if event target is one of our elements
        if (
          this.el().contains(e.target) ||
          menu.el().contains(e.target) ||
          e.target === this.el() ||
          e.target === menu.el()
        ) {
          return;
        }

        this.handleClick();
      };

      if (this._wasPlaying) {
        this.player().pause();
      }

      this.player().one('play', this._playListener);
      this.on(document, 'click', this._blurListener);
    });

    menu.on('hide', () => {
      this.removeClass('active');

      if (this._playListener) {
        this.player().off('play', this._playListener);
      }

      if (this._blurListener) {
        this.off(document, 'click', this._blurListener);
      }

      // Restore video to playing after close, if it was playing when it was opened
      if (this._wasPlaying && this.player().paused()) {
        this.player().play();
      }

      this._wasPlaying = false;
      this._playListener = null;
      this._blurListener = null;
    });

    return menu;
  }

  /**
   * Removes class that adds specific functionality we don't want
   *
   * @param {String} classNames
   * @return {String}
   */
  removePopupClass(classNames) {
    return classNames.replace(/\bvjs-menu-button-popup\b/, ' ');
  }

  /**
   * @return {string}
   */
  buildCSSClass() {
    return this.removePopupClass(`vjs-captions-button ${super.buildCSSClass()}`);
  }

  /**
   * @return {string}
   */
  buildWrapperCSSClass() {
    return this.removePopupClass(`vjs-captions-button ${super.buildWrapperCSSClass()}`);
  }

  /**
   * @see https://github.com/videojs/video.js/blob/v7.4.1/src/js/control-bar/text-track-controls/text-track-button.js#L40
   * @returns {CaptionsMenuItem[]}
   */
  createItems() {
    const player = this.player();
    const tracks = trackUtils.listToArray(player.textTracks());

    if (!tracks.length) {
      return [];
    }

    // Filter tracks to the kinds we care about, and group by language
    const trackGroups = tracks
      .filter(track => constants.KINDS.find(kind => kind === track.kind))
      .reduce((trackGroups, track) => {
        if (!(track.language in trackGroups)) {
          trackGroups[track.language] = [];
        }

        trackGroups[track.language].push(track);
        return trackGroups;
      }, {});

    return Object.entries(trackGroups).map(([language, tracks]) =>
      this.createItem(language, tracks)
    );
  }

  /**
   * @param {String} language
   * @param {TextTrack[]} tracks
   * @return {CaptionsMenuItem}
   */
  createItem(language, tracks) {
    const trackList = this.player().textTracks();
    const settings = this.getSettings();

    const track = new TextTrackLanguageGroup(language, tracks);

    if (settings.captionLanguage === language) {
      track.enable();
    } else {
      track.disable();
    }

    constants.KINDS.forEach(kind => {
      if (!settings.captionKinds.find(captionKind => kind === captionKind)) {
        track.disableKind(kind);
      }
    });

    track
      .on('enable', () => {
        settings.captionLanguage = language;
      })
      .on('enableKind', kind => {
        settings.captionKinds = settings.captionKinds.concat([kind]);
      })
      .on('disableKind', kind => {
        settings.captionKinds = settings.captionKinds.filter(captionKind => captionKind !== kind);
      });

    const item = new CaptionsMenuItem(this.player(), {
      track,
      selectable: true,
      multiSelectable: false,
      selected: track.isEnabled(),
    });

    const changeHandler = () => {
      if (!track.isEnabled() || !this.menu) {
        return;
      }

      this.menu.getCaptionItems().forEach(otherItem => {
        if (otherItem.getTrack().id !== track.id) {
          otherItem.selected(false);
        }
      });
    };

    const selectedLanguageChangeHandler = handleSelectedLanguageChange.bind({
      track,
      player_: this.player(),
    });

    item.on('change', changeHandler);
    trackList.addEventListener('selectedlanguagechange', selectedLanguageChangeHandler);

    item.on('dispose', () => {
      item.off('change', changeHandler);
      trackList.removeEventListener('selectedlanguagechange', selectedLanguageChangeHandler);
    });

    return item;
  }

  /**
   * @return {TextTrackLanguageGroup[]}
   */
  getTracks() {
    return this.items ? this.items.map(item => item.getTrack()) : [];
  }

  /**
   * @return {TextTrack}
   */
  getActiveTrack() {
    return this.items
      .filter(item => item instanceof CaptionsMenuItem && item.isSelected())
      .map(item => item.getTrack())
      .shift();
  }

  /**
   * @return {Settings}
   */
  getSettings() {
    return this.options_.settings;
  }
}

CaptionsButton.prototype.kind_ = 'captions';
CaptionsButton.prototype.controlText_ = 'Captions';

export default CaptionsButton;
