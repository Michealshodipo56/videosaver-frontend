const BACKEND_URL = (document.body.dataset.backendUrl || '').trim();
const CLIENTS = ['IOS', 'ANDROID_VR', 'TV_EMBEDDED', 'MWEB', 'WEB'];

export function isYouTubeBrowserFallbackEnabled() {
    return document.body.dataset.youtubeFallbackApis !== 'false';
}

async function gatewayFetch(input, init = {}) {
    const request = input instanceof Request ? input : new Request(input, init);
    const headers = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });

    let body;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.clone().text();
    }

    return fetch(`${BACKEND_URL}/api/youtube/gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: request.url,
            init: {
                method: request.method,
                headers,
                body: body || undefined
            }
        })
    });
}

function extractVideoId(url) {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') {
            return parsed.pathname.slice(1).split('/')[0];
        }
        const queryId = parsed.searchParams.get('v');
        if (queryId) {
            return queryId;
        }
        const parts = parsed.pathname.split('/').filter(Boolean);
        const marker = parts.findIndex((part) => ['shorts', 'embed', 'live', 'v'].includes(part));
        if (marker >= 0 && parts[marker + 1]) {
            return parts[marker + 1];
        }
    } catch {
        return null;
    }
    return null;
}

function formatDuration(seconds) {
    const total = Math.round(Number(seconds) || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (value) => String(value).padStart(2, '0');
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${minutes}:${pad(secs)}`;
}

async function resolveFormatURL(fmt, player) {
    if (fmt.url) {
        return fmt.url;
    }
    if (fmt.decipher && player) {
        try {
            return await fmt.decipher(player);
        } catch {
            return '';
        }
    }
    return '';
}

function buildOptions(formats) {
    const groups = new Map();

    formats.forEach((format) => {
        if (!format.has_video || !format.direct_url) {
            return;
        }
        const height = format.height || 0;
        if (!height) {
            return;
        }
        const existing = groups.get(height);
        if (!existing || (format.filesize || 0) > (existing.filesize || 0)) {
            groups.set(height, {
                kind: 'video',
                label: `${height}p`,
                format_id: format.format_id,
                ext: format.ext || 'mp4',
                height,
                filesize: format.filesize || 0,
                direct_url: format.direct_url
            });
        }
    });

    const options = [...groups.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, option]) => option);

    const bestAudio = formats
        .filter((format) => format.has_audio && !format.has_video && format.direct_url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    options.push({
        kind: 'audio',
        label: 'Best audio (MP3)',
        format_id: bestAudio?.format_id || 'audio',
        ext: 'mp3',
        direct_url: bestAudio?.direct_url || ''
    });

    return options;
}

export async function fetchYouTubeMetadataInBrowser(mediaURL) {
    const { Innertube } = await import('https://esm.sh/youtubei.js@14.0.0/web');
    const videoId = extractVideoId(mediaURL);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const yt = await Innertube.create({
        fetch: gatewayFetch,
        retrieve_player: false
    });

    let lastError = null;
    for (const client of CLIENTS) {
        try {
            const info = await yt.getBasicInfo(videoId, client);
            const streaming = info.streaming_data;
            if (!streaming?.adaptive_formats?.length) {
                throw new Error('no streaming data');
            }

            const formats = [];
            const seen = new Set();
            for (const fmt of streaming.adaptive_formats) {
                if (!fmt.has_video && !fmt.has_audio) {
                    continue;
                }
                const formatId = String(fmt.itag ?? '');
                if (!formatId || seen.has(formatId)) {
                    continue;
                }

                const directURL = await resolveFormatURL(fmt, yt.session?.player);
                if (!directURL) {
                    continue;
                }

                seen.add(formatId);
                formats.push({
                    format_id: formatId,
                    ext: fmt.mime_type?.includes('webm') ? 'webm' : 'mp4',
                    height: fmt.height || 0,
                    has_video: fmt.has_video,
                    has_audio: fmt.has_audio,
                    filesize: Number(fmt.content_length || 0),
                    bitrate: fmt.bitrate || 0,
                    direct_url: directURL
                });
            }

            if (!formats.length) {
                throw new Error('no usable formats');
            }

            const thumbs = info.basic_info?.thumbnail;
            const thumb = Array.isArray(thumbs) ? thumbs.at(-1)?.url : thumbs?.url;

            return {
                title: info.basic_info?.title || 'YouTube Video',
                duration: formatDuration(info.basic_info?.duration),
                thumbnail: thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                platform: 'YouTube',
                options: buildOptions(formats),
                browser_extracted: true
            };
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Could not extract YouTube video in browser');
}
