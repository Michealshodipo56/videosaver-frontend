const backendAttr = document.body.dataset.backendUrl ? document.body.dataset.backendUrl.trim() : '';
// If hosted on the same server, use relative paths (empty string). Otherwise use the provided attribute.
const BACKEND_URL = backendAttr; 

let allOptions = [];
let selectedKind = 'video';
let selectedOption = null;
let currentPlatform = '';

function detectPlatform(url) {
    url = url.toLowerCase();
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.gg')) return 'facebook';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'x';
    return null;
}

lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    gsap.from('[data-gsap="fade-down"]', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
    });

    gsap.from('[data-gsap="fade-up"]', {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        stagger: 0.2,
        ease: 'power4.out'
    });
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
        const ext = selectedOption.ext || (selectedKind === 'audio' ? 'mp3' : 'mp4');
        const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'video';
        const link = document.createElement('a');
        link.href = selectedOption.direct_url;
        link.setAttribute('download', `${safeTitle}.${ext}`);
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Download started');

        addToHistory({
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
        url: urlInput.value.trim(),
        kind: selectedOption.kind,
        format_id: selectedOption.format_id,
        title: title,
        label: label
    };
    const downloadUrl = `${BACKEND_URL}/api/${currentPlatform}/download?` + new URLSearchParams(params).toString();

    const link = document.createElement('a');
    link.href = downloadUrl.toString();
    link.click();
    showToast('Download started');

    addToHistory({
        id: 'history_' + Date.now(),
        title,
        thumbnail: document.getElementById('thumbnail').src,
        platform,
        url: urlInput.value.trim(),
        format: `${selectedOption.ext.toUpperCase()} ${label}`,
        download_url: downloadUrl.toString(),
        downloaded_at: new Date().toISOString()
    });
};

async function handleFetchMetadata() {
    const url = urlInput.value.trim();
    if (!url) {
        showToast('Paste a video link first');
        return;
    }

    currentPlatform = detectPlatform(url);
    if (!currentPlatform) {
        showToast('Unsupported URL format. Paste a valid link (YouTube, Insta, FB, X, TikTok).');
        return;
    }

    downloadBtn.disabled = true;
    resultsSection.style.display = 'block';
    resultStatus.style.display = 'flex';
    videoDetails.style.display = 'none';

    gsap.fromTo(resultsSection,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }
    );

    try {
        const response = await fetch(`${BACKEND_URL}/api/${currentPlatform}/metadata?url=${encodeURIComponent(url)}`);

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

        populateVideoInfo(data);
        allOptions = data.options || [];
        setupSelects();
    } catch (error) {
        if (currentPlatform === 'youtube') {
            try {
                const { fetchYouTubeMetadataInBrowser, isYouTubeBrowserFallbackEnabled } = await import('./youtube-browser.js');
                if (isYouTubeBrowserFallbackEnabled()) {
                    resultStatus.innerHTML = '<span>Server blocked — trying browser extraction...</span>';
                    const data = await fetchYouTubeMetadataInBrowser(url);
                    populateVideoInfo(data);
                    allOptions = data.options || [];
                    setupSelects();
                    showToast('Loaded via browser extraction');
                    return;
                }
            } catch (browserError) {
                console.error('YouTube browser fallback failed:', browserError);
            }
        }
        resultStatus.innerHTML = `<span style="color: #ef4444">⚠ Error: ${error.message}</span>`;
    } finally {
        downloadBtn.disabled = false;
    }
}

function populateVideoInfo(data) {
    resultStatus.style.display = 'none';
    videoDetails.style.display = 'grid';

    document.getElementById('videoTitle').textContent = data.title || 'Untitled Video';
    
    // Capitalize platform name for badge
    const badgeText = currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1);
    document.getElementById('platformBadge').textContent = data.platform || (badgeText === 'X' ? 'Twitter/X' : badgeText);
    document.getElementById('videoDuration').innerHTML = `<i data-lucide="clock"></i> Duration: ${data.duration || 'N/A'}`;

    const thumb = document.getElementById('thumbnail');
    thumb.src = data.thumbnail
        ? `${BACKEND_URL}/api/thumbnail?url=${encodeURIComponent(data.thumbnail)}`
        : 'images/cloud.svg';

    lucide.createIcons();
}

function setupSelects() {
    const formatOptions = document.getElementById('formatOptions');
    formatOptions.innerHTML = '';

    const choices = [
        { kind: 'video', label: 'MP4 Video' },
        { kind: 'audio', label: 'MP3 Audio' }
    ];

    choices.forEach((choice) => {
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
