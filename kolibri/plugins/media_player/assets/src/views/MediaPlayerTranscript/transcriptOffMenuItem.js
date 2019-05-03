import TranscriptMenuItem from './transcriptMenuItem';

class TranscriptOffMenuItem extends TranscriptMenuItem {
  /**
   * Mostly taken from OffTextTrackMenuItem from video.js
   *
   * @param player
   * @param {Object} [options]
   */
  constructor(player, options) {
    // Create pseudo track info
    // Requires options['kind']
    options.track = {
      player,
      kind: options.kind,
      kinds: options.kinds,
      default: false,
      mode: 'disabled',
    };

    if (!options.kinds) {
      options.kinds = [options.kind];
    }

    if (options.label) {
      options.track.label = options.label;
    } else {
      options.track.label = options.kinds.join(' and ') + ' off';
    }

    // MenuItem is selectable
    options.selectable = true;
    // MenuItem is NOT multiSelectable (i.e. only one can be marked "selected" at a time)
    options.multiSelectable = false;

    super(player, options);
  }
}

export default TranscriptOffMenuItem;
