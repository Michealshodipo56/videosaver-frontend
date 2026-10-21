const backendAttr = document.body.dataset.backendUrl ? document.body.dataset.backendUrl.trim() : '';
// If hosted on the same server, use relative paths (empty string). Otherwise use the provided attribute.
const BACKEND_URL = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) ? 'http://localhost:10000' : backendAttr;

let allOptions = [];
let selectedKind = 'video';
let selectedOption = null;
let currentPlatform = '';
let currentURL = '';
let fetching = false;
let currentItem = 0;

function timeoutSignal(milliseconds) {
    if (AbortSignal.timeout) return AbortSignal.timeout(milliseconds);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), milliseconds);
    return controller.signal;
}

function startDirectDownload(option, title) {
    const extension = option.ext || 'mp4';
    const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'video';
    const link = document.createElement('a');
    link.href = option.direct_url;
    link.setAttribute('download', `${safeTitle}.${extension}`);
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function detectPlatform(url) {
    let parsed;
    try { parsed = new URL(url); } catch { return null; }
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
    const hosts = {
        youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
        instagram: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
        facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch', 'www.fb.watch'],
        x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']
    };
    for (const [platform, names] of Object.entries(hosts)) {
        if (names.includes(host)) return platform;
    }
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
    return null;
}

window.lucide?.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const fadeDown = document.querySelectorAll('[data-gsap="fade-down"]');
    const fadeUp = document.querySelectorAll('[data-gsap="fade-up"]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Use fromTo with an explicit end state. gsap.from() records the
    // current opacity as the destination — a second call (or a race)
    // can freeze the page at opacity 0, which is what made the homepage
    // look like an empty dark screen.
    if (!window.gsap || reduceMotion) {
        fadeDown.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
        fadeUp.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
        return;
    }

    gsap.fromTo(fadeDown,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', overwrite: true }
    );
    gsap.fromTo(fadeUp,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, delay: 0.12, stagger: 0.12, ease: 'power4.out', overwrite: true }
    );
});

const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const resultStatus = document.getElementById('resultStatus');
const videoDetails = document.getElementById('videoDetails');

urlInput.addEventListener('input', () => {
    clearBtn.style.display = urlInput.value ? 'block' : 'none';
});

clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    urlInput.focus();
});

urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleFetchMetadata();
    }
});

downloadBtn.addEventListener('click', handleFetchMetadata);

document.getElementById('formatSelect').onclick = (event) => {
    document.getElementById('formatOptions').classList.toggle('show-options');
    document.getElementById('qualityOptions').classList.remove('show-options');
    event.stopPropagation();
};

document.getElementById('qualitySelect').onclick = (event) => {
    document.getElementById('qualityOptions').classList.toggle('show-options');
    document.getElementById('formatOptions').classList.remove('show-options');
    event.stopPropagation();
};

window.addEventListener('click', () => {
    document.getElementById('formatOptions').classList.remove('show-options');
    document.getElementById('qualityOptions').classList.remove('show-options');
});

document.getElementById('mainDownloadBtn').onclick = async () => {
    if (!selectedOption) {
        showToast('Select a format first');
        return;
    }

    const title = document.getElementById('videoTitle').textContent;
    const platform = document.getElementById('platformBadge').textContent;
    const label = document.querySelector('#qualitySelect .selected-value').textContent;

    if (selectedOption.direct_url) {
        startDirectDownload(selectedOption, title);
        showToast('Download started');

        window.addToHistory?.({
            id: 'history_' + Date.now(),
            title,
            thumbnail: document.getElementById('thumbnail').src,
            platform,
            url: urlInput.value.trim(),
            format: `${selectedOption.ext.toUpperCase()} ${label}`,
            download_url: selectedOption.direct_url,
            downloaded_at: new Date().toISOString()
        });
        return;
    }

    const params = {
        ...(currentItem ? { item: currentItem } : {}),
        url: currentURL,
        kind: selectedOption.kind,
        format_id: selectedOption.format_id,
        title: title,
        label: label
    };
    const downloadUrl = `${BACKEND_URL}/api/${currentPlatform}/download?` + new URLSearchParams(params).toString();

    const button = document.getElementById('mainDownloadBtn');
    const option = selectedOption;
    const sourceURL = currentURL;
    const thumbnail = document.getElementById('thumbnail').src;
    button.disabled = true;
    showToast('Preparing your download…');
    try {
        const response = await fetch(downloadUrl, { signal: timeoutSignal(960000) });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Download failed (HTTP ${response.status}). Please try again.`);
        }
        const blob = await response.blob();
        if (!blob.size) throw new Error('The download was empty. Please try again.');
        const objectURL = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectURL;
        link.download = `${title.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || 'video'}-${label}.${option.ext}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
        showToast('Download ready');
        window.addToHistory?.({
        id: 'history_' + Date.now(),
        title,
        thumbnail,
        platform,
        url: sourceURL,
        format: `${option.ext.toUpperCase()} ${label}`,
        download_url: downloadUrl.toString(),
        downloaded_at: new Date().toISOString()
        });
    } catch (error) {
        if (currentPlatform === 'youtube' && option.kind === 'video') {
            try {
                const { fetchYouTubeMetadataInBrowser, isYouTubeBrowserFallbackEnabled } = await import('./youtube-browser.js');
                if (isYouTubeBrowserFallbackEnabled()) {
                    showToast('Server blocked — switching to browser download…');
                    const browserData = await fetchYouTubeMetadataInBrowser(sourceURL);
                    const browserVideos = browserData.options.filter(candidate => candidate.kind === 'video' && candidate.direct_url);
                    const fallback = browserVideos.find(candidate => candidate.height === option.height) || browserVideos[0];
                    if (fallback) {
                        startDirectDownload(fallback, title);
                        showToast('Download started');
                        window.addToHistory?.({
                            id: 'history_' + Date.now(), title, thumbnail, platform, url: sourceURL,
                            format: `${fallback.ext.toUpperCase()} ${fallback.label}`,
                            download_url: fallback.direct_url,
                            downloaded_at: new Date().toISOString()
                        });
                        return;
                    }
                }
            } catch (browserError) {
                console.error('YouTube browser download fallback failed:', browserError);
            }
        }
        showToast(['TimeoutError', 'AbortError'].includes(error.name) ? 'Download timed out. Please try a shorter video.' : error.message);
    } finally {
        button.disabled = false;
    }
};

async function handleFetchMetadata() {
    if (fetching) return;
    const url = urlInput.value.trim();
    if (!url) {
        showToast('Paste a video link first');
        return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
        showToast('Unsupported URL format. Paste a valid link (YouTube, Insta, FB, X, TikTok).');
        return;
    }

    downloadBtn.disabled = true;
    fetching = true;
    currentPlatform = platform;
    currentURL = url;
    selectedOption = null;
    allOptions = [];
    resultsSection.style.display = 'block';
    resultStatus.style.display = 'flex';
    resultStatus.textContent = 'Loading video details…';
    videoDetails.style.display = 'none';

    window.gsap?.fromTo(resultsSection,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }
    );

    try {
        const response = await fetch(`${BACKEND_URL}/api/${currentPlatform}/metadata?url=${encodeURIComponent(url)}`, { signal: timeoutSignal(120000) });

        // Guard: check if response is JSON before parsing
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', response.status, text.substring(0, 200));
            if (response.status === 502 || response.status === 503) {
                throw new Error('Server is starting up — please try again in 30 seconds');
            }
            throw new Error(`Server returned an unexpected response (HTTP ${response.status})`);
        }

        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to inspect video');
        }

        document.getElementById('videoItemSelect')?.remove();
        if (Array.isArray(data.items) && data.items.length > 1) {
            const select = document.createElement('select');
            select.id = 'videoItemSelect';
            select.setAttribute('aria-label', 'Choose video in this post');
            data.items.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `Video ${index + 1}: ${item.title || 'Untitled'}`;
                select.appendChild(option);
            });
            select.onchange = () => displayVideo(data.items[Number(select.value)]);
            videoDetails.before(select);
        }
        displayVideo(data);
    } catch (error) {
        if (currentPlatform === 'youtube') {
            try {
                const { fetchYouTubeMetadataInBrowser, isYouTubeBrowserFallbackEnabled } = await import('./youtube-browser.js');
                if (isYouTubeBrowserFallbackEnabled()) {
                    resultStatus.innerHTML = '<span>Server blocked — trying browser extraction...</span>';
                    const data = await fetchYouTubeMetadataInBrowser(url);
                    displayVideo(data);
                    showToast('Loaded via browser extraction');
                    return;
                }
            } catch (browserError) {
                console.error('YouTube browser fallback failed:', browserError);
            }
        }
        const msg = document.createElement('span');
        msg.style.color = '#ef4444';
        msg.textContent = `⚠ Error: ${error.message}`;
        resultStatus.replaceChildren(msg);
    } finally {
        downloadBtn.disabled = false;
        fetching = false;
    }
}

function displayVideo(data) {
    currentItem = data.item || 0;
    populateVideoInfo(data);
    allOptions = Array.isArray(data.options) ? data.options : [];
    setupSelects();
}

function populateVideoInfo(data) {
    resultStatus.style.display = 'none';
    videoDetails.style.display = 'grid';

    document.getElementById('videoTitle').textContent = data.title || 'Untitled Video';
    
    // Capitalize platform name for badge
    const badgeText = currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1);
    document.getElementById('platformBadge').textContent = data.platform || (badgeText === 'X' ? 'Twitter/X' : badgeText);
    document.getElementById('videoDuration').textContent = `Duration: ${data.duration || 'N/A'}`;

    const thumb = document.getElementById('thumbnail');
    thumb.onerror = () => { thumb.onerror = null; thumb.src = 'images/cloud.svg'; };
    thumb.src = data.thumbnail
        ? `${BACKEND_URL}/api/thumbnail?url=${encodeURIComponent(data.thumbnail)}`
        : 'images/cloud.svg';

    window.lucide?.createIcons();
}

function setupSelects() {
    const formatOptions = document.getElementById('formatOptions');
    formatOptions.innerHTML = '';

    const choices = [
        { kind: 'video', label: 'MP4 Video' },
        { kind: 'audio', label: 'MP3 Audio' }
    ];

    choices.filter(choice => allOptions.some(option => option.kind === choice.kind)).forEach((choice) => {
        const item = document.createElement('div');
        item.textContent = choice.label;
        item.onclick = (e) => {
            e.stopPropagation();
            selectKind(choice.kind, choice.label);
        };
        formatOptions.appendChild(item);
    });

    const hasVideo = allOptions.some((option) => option.kind === 'video');
    selectKind(hasVideo ? 'video' : 'audio', hasVideo ? 'MP4 Video' : 'MP3 Audio');
}

function selectKind(kind, label) {
    selectedKind = kind;
    document.querySelector('#formatSelect .selected-value').textContent = label;
    document.getElementById('formatOptions').classList.remove('show-options');

    const filtered = allOptions.filter((option) => option.kind === kind);
    const qualityOptions = document.getElementById('qualityOptions');
    qualityOptions.innerHTML = '';

    filtered.forEach((option) => {
        const item = document.createElement('div');
        item.textContent = option.label;
        item.onclick = (e) => {
            e.stopPropagation();
            selectOption(option);
        };
        qualityOptions.appendChild(item);
    });

    if (filtered.length > 0) {
        selectOption(filtered[0]);
    } else {
        selectedOption = null;
        document.querySelector('#qualitySelect .selected-value').textContent = 'No formats found';
        document.getElementById('fileSize').textContent = 'Size: —';
    }
}

function selectOption(option) {
    selectedOption = option;
    document.querySelector('#qualitySelect .selected-value').textContent = option.label;
    document.getElementById('qualityOptions').classList.remove('show-options');
    document.getElementById('fileSize').textContent = `Size: ${formatFileSize(option.filesize)}`;
}

function formatFileSize(bytes) {
    if (selectedKind === 'audio') return 'Converted on download';
    if (!bytes || bytes <= 0) return '—';

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `~${value.toFixed(1)} ${units[index]}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

const reportForm = document.getElementById('reportForm');
if (reportForm) {
    reportForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const reportBtn = document.getElementById('reportBtn');
        const originalContent = reportBtn.innerHTML;

        reportBtn.disabled = true;
        reportBtn.innerHTML = '<span>Sending...</span><i class="loader-spinner" style="width: 1.2rem; height: 1.2rem; border-width: 2px;"></i>';

        try {
            await emailjs.sendForm('service_ppsisbr', 'template_of5ydps', reportForm);
            showToast('Report sent successfully');
            reportForm.reset();
        } catch (error) {
            console.error('EmailJS error:', error);
            showToast('Failed to send report');
        } finally {
            reportBtn.disabled = false;
            reportBtn.innerHTML = originalContent;
        }
    });
}

const restoredURL = new URLSearchParams(window.location.search).get('url');
if (restoredURL) {
    urlInput.value = restoredURL;
    handleFetchMetadata();
}
document.querySelectorAll('.platform-item').forEach(link => {
    link.href = '#urlInput';
    link.addEventListener('click', () => urlInput.focus());
});
