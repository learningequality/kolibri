import axios, { AxiosPromise } from "axios";

// Functions connnected with using Bloom Player to preview and record video (and audio)

export interface SoundData {
    src: string;
    volume: Number;
    startTime: string;
    // if not set, BloomPlayer played the whole sound, so all of it should be used in a merged audio stream
    endTime?: string;
}

let soundsPlayed: SoundData[] = [];

// Log, for later reporting with reportSoundsLogged, that we are starting to play
// a sound with the specified src url at the specified volume.
// Returns a number identifiying this particular sound which may later be passed
// to other log functions.
export function logSound(src: string, volume: Number): number {
    const index = soundsPlayed.length;
    soundsPlayed.push({ src, volume, startTime: new Date().toISOString() });
    return index;
}

// Log that the specified sound was paused. This is not intended to be
// used for the user pausing playback, which is not expected to happen when we
// are logging sounds. So the typical usage is to indicate that a background
// 'music' sound has been stopped, either because we got to the end of the book,
// or because we started a new page that specifies different music.
// We may get a pause request from the container after the whole recording
// is over, at which point the log has been cleared and we can't (and don't want)
// to log again. To prevent an exception, we check for the index being out of range.
export function logSoundPaused(index: number): void {
    if (index >= 0 && index < soundsPlayed.length) {
        soundsPlayed[index].endTime = new Date().toISOString();
    }
}

export function clearSoundLog() {
    soundsPlayed = [];
}

// Log restarting a previous (typically background music) sound.
export function logSoundRepeat(index: number): number {
    const newIndex = soundsPlayed.length;
    soundsPlayed.push({
        ...soundsPlayed[index],
        startTime: new Date().toISOString()
    });
    return newIndex;
}

// Called when we reach the end of the book, this reports all the sounds we have
// played to a bloom API.
export function reportSoundsLogged(): void {
    // JSON normally uses UTF-8. Need to explicitly set it because UTF-8 is not the default for axios
    sendToBloomApi(
        "publish/av/soundLog",
        soundsPlayed,
        "application/json; charset=utf-8"
    );
}

export function sendStringToBloomApi(
    urlSuffix: string,
    data: any
): AxiosPromise<any> {
    return sendToBloomApi(urlSuffix, data, "text/plain");
}

function sendToBloomApi(
    urlSuffix: string,
    data: any,
    contentType: string
): AxiosPromise<any> {
    return axios.post("/bloom/api/" + urlSuffix, data, {
        headers: {
            "Content-Type": contentType
        }
    });
}
