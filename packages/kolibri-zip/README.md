# kolibri-zip

A ZIP file library optimized for streaming large archives over HTTP. Provides adaptive loading that minimizes bandwidth usage for large files while maintaining fast access for small files.

## Features

- **Adaptive loading**: Automatically chooses between full download (small files) and lazy range requests (large files)
- **Chunked fetching**: Groups nearby file reads into single HTTP range requests to minimize request count
- **Large file URL generation**: Delegates large media files to external URLs (e.g., CDN) instead of extracting
- **Path replacement**: Automatically rewrites internal references (CSS `url()`, HTML `src`/`href`) to appropriate URLs
- **XHR-based**: Uses XMLHttpRequest for iOS Safari 9.3 compatibility

## Usage

```javascript
import ZipFile from 'kolibri-zip';

// Basic usage - automatically handles small vs large files
const zip = new ZipFile('https://example.com/content.zip');

// Extract a single file
const htmlFile = await zip.file('index.html');
console.log(htmlFile.toString()); // File contents as string
console.log(htmlFile.toUrl());    // Blob URL for use in <img>, <script>, etc.

// Extract files by path prefix
const assets = await zip.files('assets/');

// Extract files by extension
const cssFiles = await zip.filesFromExtension('.css');

// Clean up blob URLs when done
zip.close();
```

See `ZipFile`, `ExtractedFile`, and `AdaptiveHttpReader` JSDocs in the source for full API details.

## How It Works

### Adaptive Loading

1. **Small archives** (`< maxFullLoadSize`): Downloaded entirely in one request for fast access
2. **Large archives** (`>= maxFullLoadSize`): The initial download is aborted after headers are received, and the reader switches to HTTP range requests to fetch only needed data
3. **Large media within large archives** (audio/video `>= largeMediaThreshold`): Instead of extracting from the ZIP, these are served directly via a `largeFileUrlGenerator` URL

### Chunked Fetching

When in lazy mode, the reader groups nearby file reads into chunks:

```
File layout:  [file1][file2][file3]......[file4][file5]
Chunks:       [=====chunk1=====]         [===chunk2===]
```

This reduces the number of HTTP requests when extracting multiple files. Concurrent reads from the same chunk are deduplicated into a single fetch.

### Large Media File Handling

For large video/audio files, provide a `largeFileUrlGenerator` to serve them directly:

```javascript
const zip = new ZipFile('content.zip', {
  largeFileUrlGenerator: filename => `https://cdn.example.com/media/${filename}`,
});

const video = await zip.file('media/video.mp4');
video.toUrl();    // Returns the generated URL (no extraction needed)
video.toString(); // Throws - file data was not downloaded
```

Note: `largeMediaThreshold` only takes effect when `largeFileUrlGenerator` is also provided.

### Path Replacement

When extracting text files, internal references are automatically rewritten to usable URLs:

```css
/* Original in ZIP */
.icon { background: url("images/icon.png"); }

/* After extraction */
.icon { background: url("blob:..."); }
```

Built-in mappers handle CSS (`url()`, `@import`), HTML/XHTML/XML (`src`, `href`, `srcset`, inline styles, `<style>` blocks). Custom mappers can be added by extending the `Mapper` class from `fileUtils.js` and passing them via the `filePathMappers` option.
