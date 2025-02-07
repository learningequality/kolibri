import { BookInteraction } from "./bookInteraction";

test("pagesShown getProgressReportPropertiesForAnalytics", () => {
    const bookInteraction = new BookInteraction();

    let progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(progressReportPropertiesForAnalytics.audioPages).toEqual(0);
    expect(progressReportPropertiesForAnalytics.nonAudioPages).toEqual(0);
    expect(progressReportPropertiesForAnalytics.videoPages).toEqual(0);

    for (let i = 0; i < 5; i++) {
        bookInteraction.pageShown(i);
    }
    for (let i = 0; i < 5; i++) {
        bookInteraction.pageShown(i);
    }
    bookInteraction.audioPageShown(2);
    bookInteraction.audioPageShown(4);
    bookInteraction.videoPageShown(1);

    progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(progressReportPropertiesForAnalytics.audioPages).toEqual(2);
    expect(progressReportPropertiesForAnalytics.nonAudioPages).toEqual(3);
    expect(progressReportPropertiesForAnalytics.videoPages).toEqual(1);

    bookInteraction.clearPagesShown();

    progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(progressReportPropertiesForAnalytics.audioPages).toEqual(0);
    expect(progressReportPropertiesForAnalytics.nonAudioPages).toEqual(0);
    expect(progressReportPropertiesForAnalytics.videoPages).toEqual(0);
});

test("lastNumberedPageWasRead", () => {
    const bookInteraction = new BookInteraction();
    let progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(
        progressReportPropertiesForAnalytics.lastNumberedPageRead
    ).toBeFalsy();

    bookInteraction.lastNumberedPageWasRead = true;

    progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(
        progressReportPropertiesForAnalytics.lastNumberedPageRead
    ).toBeTruthy();
});

test("totalAudioDuration and totalVideoDuration", () => {
    const bookInteraction = new BookInteraction();
    let progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(progressReportPropertiesForAnalytics.audioDuration).toEqual(0);
    expect(progressReportPropertiesForAnalytics.videoDuration).toEqual(0);

    bookInteraction.totalAudioDuration += 10;
    bookInteraction.totalAudioDuration += 20;

    bookInteraction.totalVideoDuration += 100;

    progressReportPropertiesForAnalytics = bookInteraction.getProgressReportPropertiesForAnalytics();
    expect(progressReportPropertiesForAnalytics.audioDuration).toEqual(30);
    expect(progressReportPropertiesForAnalytics.videoDuration).toEqual(100);
});
