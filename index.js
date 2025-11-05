// index.js
// Extracted from index.html to keep JS separate. On-screen text remains French; code/comments in English.

// Header hamburger toggle
document.addEventListener('DOMContentLoaded', async function () {
  // Auto-update month/year text in index page meta and title
  try {
    const now = new Date();
    const monthsFr = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const mois = monthsFr[now.getMonth()];
    const annee = now.getFullYear();

    // Update the small meta line: "Newsletter — Mois AAAA"
    const metaEl = document.querySelector('.kyo-meta .meta');
    if (metaEl) {
      const base = 'Newsletter — ';
      metaEl.textContent = base + (mois.charAt(0).toUpperCase() + mois.slice(1)) + ' ' + annee;
    }

  // Initialize blurred backdrops and smart-fit for existing base tiles in index.html
  try {
    const baseTileImgs = document.querySelectorAll('.cards-grid.kyo-tiles:not(.dynamic-articles) .kyo-tile-media img');
    baseTileImgs.forEach(img => {
      const link = img.closest('.kyo-tile-media');
      if (!link) return;
      const apply = () => {
        try {
          const src = img.currentSrc || img.src || '';
          if (src) link.style.setProperty('--tile-bg', `url("${src}")`);
          const nw = img.naturalWidth || 0;
          const nh = img.naturalHeight || 0;
          if (nw && nh) {
            const ratio = nw / nh;
            const target = 16 / 9;
            const diff = Math.abs(ratio - target);
            if (diff < 0.1) {
              link.classList.remove('fit-contain');
              link.classList.add('fit-cover');
            } else {
              link.classList.remove('fit-cover');
              link.classList.add('fit-contain');
            }
          }
        } catch (_) { /* ignore */ }
      };
      if (img.complete) {
        // If the image is already loaded, apply immediately
        apply();
      } else {
        img.addEventListener('load', apply, { once: true });
      }
    });
  } catch (_) { /* no-op */ }

    // Update the main title if it follows the pattern "Comptez sur nous — Mois AAAA"
    const titleEl = document.querySelector('h1.title-accent');
    if (titleEl) {
      const txt = titleEl.textContent || '';
      const parts = txt.split('—');
      if (parts.length >= 1) {
        const prefix = parts[0].trim();
        titleEl.textContent = `${prefix} — ${mois.charAt(0).toUpperCase() + mois.slice(1)} ${annee}`;
      }
    }
  } catch (e) { /* no-op */ }

  const hamburger = document.getElementById('hamburger');
  const headerNav = document.querySelector('.header-nav');
  if (hamburger && headerNav) {
    hamburger.addEventListener('click', function () {
      headerNav.classList.toggle('active');
      const spans = hamburger.querySelectorAll('span');
      if (headerNav.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });
  }
});

// Dynamic content syncing for tiles and hero
document.addEventListener('DOMContentLoaded', async function () {
  // Configure the starting synced content (video or article)
  // Example values:
  //   'TypeNews/edito/video1.html' (video)
  //   'TypeNews/animation/articleanimation.html' (article)
  // Default fallback; will be replaced by first available edito/article*.html
  let START_SOURCE = 'TypeNews/edito/video1.html';
  const contentConfig = [
    {
      source: START_SOURCE,
      titleSelector: 'h1, h2, h3',
      imageSelector: 'img',
      // Hero résumé follows the 22px "Résumé" style from the editor
      descSelector: 'p span[style*="font-size: 22px"], [style*="font-size: 22px"]',
      targetTitle: '.title-accent',
      targetImage: '.newsletter-hero img', // hero image now synced with edito/article*.html
      targetDesc: '.lead',
      errorMsg: 'Hero (TypeNews/edito/article*)',
      // Prefer images with filename starting with this prefix when available
      preferImagePrefix: 'edito'
    }
  ];

  // Hero navigation state
  let HERO_SOURCES = [];
  let HERO_INDEX = 0;

  // Probe for the first available edito/article*.html to drive hero sync
  async function findFirstEditoArticle(startIndex = 1, maxIndex = 5) {
    for (let i = startIndex; i <= maxIndex; i++) {
      const url = `TypeNews/edito/article${i}_edito.html`;
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
        if (res.ok) return url;
      } catch (_) { /* skip */ }
    }
    return '';
  }

  // Discover all available edito article pages in a range
  async function findEditoArticles(startIndex = 1, maxIndex = 10) {
    const list = [];
    let consecutiveMisses = 0;
    for (let i = startIndex; i <= maxIndex; i++) {
      const variants = [
        `TypeNews/edito/article${i}_edito.html`,
        `TypeNews/edito/article_${i}_edito.html`,
        `TypeNews/edito/article${i}.html`
      ];
      let foundUrl = '';
      for (const url of variants) {
        try {
          const res = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
          if (res.ok) { foundUrl = url; break; }
        } catch (_) { /* try next variant */ }
        await new Promise(r => setTimeout(r, 40));
      }
      if (foundUrl) {
        list.push(foundUrl);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
      }
      // small delay to avoid spamming server
      await new Promise(r => setTimeout(r, 60));
      if (consecutiveMisses >= 2) break;
    }
    return list;
  }

  // Helper: extract a meaningful title from a fetched HTML document
  // Priority: inline style font-size:52px > font[size="7"] > first h1/h2/h3
  function extractTitleFromDoc(doc, fallbackSelector) {
    // 1) Scan for any element explicitly styled with font-size:52px and return first non-empty text
    const fsCandidates = doc.querySelectorAll('span[style*="font-size: 52px"], span[style*="font-size:52px"], [style*="font-size: 52px"], [style*="font-size:52px"]');
    for (const el of fsCandidates) {
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }

    // 2) Scan for <font size="7"> with non-empty text
    const fontCandidates = doc.querySelectorAll('font[size="7"]');
    for (const el of fontCandidates) {
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }

    // 3) Fallback: scan provided selector or generic headings and pick first non-empty
    const sel = fallbackSelector || 'h1, h2, h3';
    const headCandidates = doc.querySelectorAll(sel);
    for (const el of headCandidates) {
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
    return '';
  }

  // Resolve relative URL against a base
  function resolveUrl(rel, baseHref) {
    try {
      const raw = String(rel || '');
      // If it's an asset under project root folders, keep it root-relative for index.html context
      if (/^(Image|media)\//i.test(raw)) {
        return raw; // let browser resolve against index.html root
      }
      return new URL(raw, baseHref).href;
    } catch {
      return rel;
    }
  }

  // Capture a frame from a same-origin video as data URL
  async function captureFrameFromVideo(videoUrl, seekTime = 0.1, width = 800) {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.playsInline = true;
        // crossOrigin only if same-origin or server allows it; otherwise omit to avoid tainting
        // video.crossOrigin = 'anonymous';

        const onError = () => resolve('');
        video.addEventListener('error', onError, { once: true });
        video.addEventListener('loadeddata', () => {
          try {
            // Set target size
            const ratio = video.videoWidth / (video.videoHeight || 1);
            const targetW = width;
            const targetH = Math.max(1, Math.round(width / (ratio || 1)));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;

            const seekAndDraw = () => {
              try {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, targetW, targetH);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
                resolve(dataUrl || '');
              } catch {
                resolve('');
              }
            };

            // Try to seek slightly into the video for a non-black frame
            if (!isNaN(seekTime) && video.seekable && video.seekable.length > 0) {
              try {
                video.currentTime = Math.min(seekTime, video.seekable.end(0) || seekTime);
                video.addEventListener('seeked', seekAndDraw, { once: true });
              } catch {
                // Fallback: draw immediately
                seekAndDraw();
              }
            } else {
              seekAndDraw();
            }
          } catch {
            resolve('');
          }
        }, { once: true });

        // Safety timeout
        setTimeout(() => resolve(''), 2000);
      } catch {
        resolve('');
      }
    });
  }

  // Extract best thumbnail/image from a document (img > video poster > YouTube > Vimeo), with project fallbacks
  async function getBestImageFromDoc(doc, sourceUrl, preferPrefix) {
    const baseUrl = new URL(sourceUrl, window.location.href);
    // 1) Prefer <img> whose filename starts with preferPrefix (if provided)
    try {
      const allImgs = Array.from(doc.querySelectorAll('img'));
      if (preferPrefix && allImgs.length) {
        const pref = allImgs.find(im => {
          const raw = im.getAttribute('src') || im.src || '';
          if (!raw) return false;
          try {
            const abs = new URL(raw, baseUrl).href;
            const fname = abs.split('/').pop() || '';
            return fname.toLowerCase().startsWith(preferPrefix.toLowerCase());
          } catch { return false; }
        });
        if (pref) {
          const src = pref.getAttribute('src') || pref.src;
          if (src) return resolveUrl(src, baseUrl);
        }
      }
      // 1b) Fallback: first <img>
      const imgEl = allImgs[0];
      if (imgEl) {
        const src = imgEl.getAttribute('src') || imgEl.src;
        if (src) return resolveUrl(src, baseUrl);
      }
    } catch { /* ignore */ }
    // 2) <video poster="...">
    const videoEl = doc.querySelector('video[poster]');
    if (videoEl) {
      const poster = videoEl.getAttribute('poster');
      if (poster) return resolveUrl(poster, baseUrl);
    }
    // 2b) <video src="..."> without poster: try capture a frame (same-origin only)
    const videoNoPoster = doc.querySelector('video[src]');
    if (videoNoPoster) {
      const vSrc = videoNoPoster.getAttribute('src');
      if (vSrc) {
        if (/^blob:/i.test(vSrc)) {
          console.debug('[index.js] Skipping blob: video src; rely on poster generated at save time.');
        } else {
          const abs = resolveUrl(vSrc, baseUrl);
          const frame = await captureFrameFromVideo(abs);
          if (frame) return frame;
        }
      }
    }
    // 2c) <video><source src="..."></video> without poster
    const videoSource = doc.querySelector('video source[src]');
    if (videoSource) {
      const sSrc = videoSource.getAttribute('src');
      if (sSrc) {
        // Ignore blob: URLs (not resolvable across documents)
        if (/^blob:/i.test(sSrc)) {
          console.debug('[index.js] Skipping blob: video source; please add a poster attribute for hero/grid thumbnail.');
        } else {
          const abs = resolveUrl(sSrc, baseUrl);
          const frame = await captureFrameFromVideo(abs);
          if (frame) return frame;
        }
      }
    }
    // 3) YouTube (iframe or link)
    const ytIframe = doc.querySelector('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    const ytLink = doc.querySelector('a[href*="youtube.com"], a[href*="youtu.be"]');
    let ytUrl = ytIframe ? ytIframe.getAttribute('src') : (ytLink ? ytLink.getAttribute('href') : '');
    if (ytUrl) {
      try {
        const u = new URL(ytUrl, baseUrl);
        // Extract ID from common formats
        // https://www.youtube.com/watch?v=ID or youtu.be/ID or /embed/ID
        let id = u.searchParams.get('v');
        if (!id) {
          const m = u.pathname.match(/(?:\/embed\/|\/shorts\/|\/)([A-Za-z0-9_-]{6,})/);
          if (m && m[1]) id = m[1];
        }
        if (id) {
          // Try maxres, clients fall back visually if 404; we keep single URL
          return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        }
      } catch { /* ignore */ }
    }
    // 4) Vimeo (iframe or link) via public oEmbed
    const viIframe = doc.querySelector('iframe[src*="vimeo.com"]');
    const viLink = doc.querySelector('a[href*="vimeo.com"]');
    let viUrl = viIframe ? viIframe.getAttribute('src') : (viLink ? viLink.getAttribute('href') : '');
    if (viUrl) {
      try {
        const absolute = new URL(viUrl, baseUrl).href;
        const oembed = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(absolute)}`);
        if (oembed.ok) {
          const data = await oembed.json();
          if (data.thumbnail_url) return data.thumbnail_url;
        }
      } catch { /* ignore */ }
    }
    // 5) Fallback: probe local Image/ folder for files starting with the preferred prefix
    if (preferPrefix) {
      try {
        const bases = [
          `${preferPrefix}`,
          `${preferPrefix}1`, `${preferPrefix}2`, `${preferPrefix}3`, `${preferPrefix}4`, `${preferPrefix}5`,
          `${preferPrefix}-1`, `${preferPrefix}-2`, `${preferPrefix}-3`
        ];
        const exts = ['jpg','jpeg','png','webp','gif'];
        for (const b of bases) {
          for (const ext of exts) {
            const url = `Image/${b}.${ext}`;
            try {
              const res = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
              if (res.ok) return url;
            } catch (_) { /* try next */ }
          }
        }
      } catch (_) { /* no-op */ }
    }
    // 6) Fallback: specifically check Image/edito/<preferPrefix>.<ext>
    if (preferPrefix) {
      try {
        const exts = ['png','jpg','jpeg','webp','gif'];
        for (const ext of exts) {
          const url = `Image/edito/${preferPrefix}.${ext}`;
          try {
            const res = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
            if (res.ok) return url;
          } catch (_) { /* try next */ }
        }
      } catch (_) { /* no-op */ }
    }
    // 7) Fallback: check Image/edito/article{N}_edito.* and Image/edito/edito_article{N}.* derived from source URL
    try {
      const m = String(sourceUrl || '').match(/article\s*(_)?\s*(\d+)/i);
      const num = m && m[2] ? m[2] : '';
      if (num) {
        const candidates = [
          `Image/edito/article${num}_edito`,
          `Image/edito/edito_article${num}`
        ];
        const exts = ['png','jpg','jpeg','webp','gif'];
        for (const base of candidates) {
          for (const ext of exts) {
            const url = `${base}.${ext}`;
            try {
              const res = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
              if (res.ok) return url;
            } catch (_) { /* continue */ }
          }
        }
      }
    } catch (_) { /* no-op */ }
    return '';
  }

  async function updateContent(config) {
    try {
      const response = await fetch(`${config.source}?t=${Date.now()}`);
      // If the source file does not exist, disable future sync attempts for this config
      if (!response.ok) {
        if (response.status === 404) {
          // Mark this config as disabled to stop further retries/interval syncs
          config._disabled = true;
          console.debug(`[index.js] Source not found (404). Disabling sync for: ${config.errorMsg} -> ${config.source}`);
          return true; // treat as non-fatal so retry loop won't re-run
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Title (robust extraction to avoid empty headings)
      const targetTitle = document.querySelector(config.targetTitle);
      if (targetTitle) {
        const extracted = extractTitleFromDoc(doc, config.titleSelector);
        if (extracted) {
          targetTitle.textContent = extracted;
          console.debug(`[index.js] Synced title for ${config.errorMsg}:`, extracted);
        } else {
          console.debug(`[index.js] No title extracted for ${config.errorMsg}`);
        }
      }

      // Image (with video/URL fallbacks)
      const targetImage = document.querySelector(config.targetImage);
      if (targetImage) {
        const best = await getBestImageFromDoc(doc, config.source, config.preferImagePrefix);
        if (best) {
          targetImage.src = best;
          // Try to set alt from first img if available
          const imgEl = doc.querySelector('img');
          targetImage.alt = (imgEl && (imgEl.getAttribute('alt') || '')) || '';
          // Make hero image load eagerly with higher priority
          try {
            targetImage.removeAttribute('loading');
            targetImage.decoding = 'async';
            targetImage.setAttribute('fetchpriority', 'high');
          } catch (_) { /* no-op */ }
          console.debug(`[index.js] Synced hero media for ${config.errorMsg}:`, best);
          // Also sync the hero anchor to newsletter page with article param (short code)
          const heroAnchor = targetImage.closest('a');
          if (heroAnchor) {
            // Build short code like "article1_animation" or "video1_edito" from path
            try {
              const srcPath = config.source || '';
              // Expecting pattern TypeNews/<folder>/<file>.html
              const m = srcPath.match(/^\s*TypeNews\/([^\/]+)\/([^\/?#]+)\.(html?)\s*$/i);
              let shortCode = '';
              if (m) {
                const folder = m[1];
                const filename = m[2];
                // If filename already ends with _<folder>, don't duplicate suffix
                if (filename.toLowerCase().endsWith(`_${folder.toLowerCase()}`)) {
                  shortCode = filename;
                } else {
                  shortCode = `${filename}_${folder}`;
                }
              } else {
                // Fallback to encoding full path if pattern doesn't match
                shortCode = srcPath;
              }
              const param = encodeURIComponent(shortCode);
              heroAnchor.href = `newsletter_C.html?article=${param}`;
            } catch (_) {
              const param = encodeURIComponent(config.source || '');
              heroAnchor.href = `newsletter_C.html?article=${param}`;
            }
          }
        } else {
          console.debug(`[index.js] No media found for ${config.errorMsg}`);
        }
      }

      // Description
      if (config.descSelector && config.targetDesc) {
        let descElement = doc.querySelector(config.descSelector);
        // Broaden: allow any element with inline 22px font-size (not just within <p>)
        if (!descElement) descElement = doc.querySelector('[style*="font-size: 22px"], [style*="font-size:22px"]');
        if (!descElement) descElement = doc.querySelector('p span[style*="font-size:"]');
        if (!descElement) descElement = Array.from(doc.querySelectorAll('p')).find(p => (p.innerText || p.textContent || '').trim().length > 0);
        const targetDesc = document.querySelector(config.targetDesc);
        if (descElement && targetDesc) {
          const descText = descElement.innerText || descElement.textContent || '';
          const trimmedDesc = descText.trim();
          if (trimmedDesc) targetDesc.textContent = trimmedDesc;
          console.debug(`[index.js] Synced desc for ${config.errorMsg}:`, trimmedDesc);
        } else {
          console.debug(`[index.js] No description found for ${config.errorMsg}`);
        }
      }
      return true;
    } catch (error) {
      // Downgrade to debug to reduce console noise; retry loop will handle transient issues
      console.debug(`Error syncing ${config.errorMsg}:`, error);
      return false;
    }
  }

  async function syncContentWithRetry(config, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      const success = await updateContent(config);
      if (success) return true;
      if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
    }
    return false;
  }

  function initRealTimeSync() {
    // Initial run
    contentConfig.forEach(config => { syncContentWithRetry(config); });
    // Periodic re-sync only for active (not disabled) configs
    const syncInterval = setInterval(() => {
      contentConfig
        .filter(cfg => !cfg._disabled)
        .forEach(cfg => { syncContentWithRetry(cfg); });
    }, 5000);
    window.addEventListener('beforeunload', () => { clearInterval(syncInterval); });
  }

  // Determine proper hero source before starting sync
  try {
    // Build the hero rotation list from available edito articles
    const list = await findEditoArticles(1, 5);
    if (list && list.length) {
      HERO_SOURCES = list;
      HERO_INDEX = 0;
      START_SOURCE = HERO_SOURCES[HERO_INDEX];
      contentConfig[0].source = START_SOURCE;
      
      // Derive image prefix from article number: article<N>_edito (matches Image/edito/articleN_edito.*)
      try {
        const m = START_SOURCE.match(/article(\d+)_edito\.html$/i);
        if (m && m[1]) {
          contentConfig[0].preferImagePrefix = `article${m[1]}_edito`;
        }
      } catch (_) { /* keep existing prefix */ }
    } else {
      // Fallback remains video1 if no article*.html found
      contentConfig[0].source = 'TypeNews/edito/video1.html';
    }
  } catch (_) {
    contentConfig[0].source = 'TypeNews/edito/video1.html';
  }

  initRealTimeSync();

  // Wire hero navigation buttons if multiple sources are available
  try {
    const heroEl = document.querySelector('.newsletter-hero');
    const prevBtn = document.querySelector('.newsletter-hero .hero-prev');
    const nextBtn = document.querySelector('.newsletter-hero .hero-next');

    // Make hero focusable for keyboard navigation
    if (heroEl && !heroEl.hasAttribute('tabindex')) {
      try { heroEl.setAttribute('tabindex', '0'); } catch (_) {}
    }

    async function validateUrlOk(url) {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
        return res.ok;
      } catch { return false; }
    }

    async function setHeroByIndex(newIndex) {
      if (!HERO_SOURCES || !HERO_SOURCES.length) return;
      // Try up to N times to find a valid entry; remove invalid ones as we go
      const max = HERO_SOURCES.length;
      let attempts = 0;
      let idx = ((newIndex % max) + max) % max;
      while (attempts < max && HERO_SOURCES.length) {
        const candidate = HERO_SOURCES[idx];
        const ok = await validateUrlOk(candidate);
        if (ok) {
          HERO_INDEX = idx;
          contentConfig[0].source = candidate;
          // Update image preference based on article number
          try {
            const m = candidate.match(/article(\d+)_edito\.html$/i);
            if (m && m[1]) {
              contentConfig[0].preferImagePrefix = `article${m[1]}_edito`;
            }
          } catch (_) { /* keep previous */ }
          // Trigger immediate sync
          syncContentWithRetry(contentConfig[0]);
          break;
        } else {
          // Remove invalid entry and adjust index
          HERO_SOURCES.splice(idx, 1);
          if (!HERO_SOURCES.length) break;
          idx = idx % HERO_SOURCES.length;
          attempts++;
          continue;
        }
      }
      const show = HERO_SOURCES.length > 1;
      if (prevBtn) prevBtn.style.display = show ? 'flex' : 'none';
      if (nextBtn) nextBtn.style.display = show ? 'flex' : 'none';
    }

    const multiple = (HERO_SOURCES && HERO_SOURCES.length > 1);
    if (prevBtn) prevBtn.style.display = multiple ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = multiple ? 'flex' : 'none';

    

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => setHeroByIndex(HERO_INDEX - 1));
      nextBtn.addEventListener('click', () => setHeroByIndex(HERO_INDEX + 1));

      // Keyboard arrow navigation when hero has focus
      if (heroEl) {
        heroEl.addEventListener('keydown', (e) => {
          const key = e.key || e.code;
          if (key === 'ArrowLeft' || key === 'Left') {
            e.preventDefault();
            setHeroByIndex(HERO_INDEX - 1);
          } else if (key === 'ArrowRight' || key === 'Right') {
            e.preventDefault();
            setHeroByIndex(HERO_INDEX + 1);
          }
        });

        // Basic touch swipe support
        let touchStartX = 0;
        let touching = false;
        heroEl.addEventListener('touchstart', (e) => {
          try {
            const t = e.touches && e.touches[0];
            if (!t) return;
            touchStartX = t.clientX;
            touching = true;
          } catch (_) {}
        }, { passive: true });
        heroEl.addEventListener('touchend', (e) => {
          if (!touching) return;
          touching = false;
          try {
            const t = e.changedTouches && e.changedTouches[0];
            if (!t) return;
            const dx = t.clientX - touchStartX;
            const threshold = 30; // minimal swipe distance
            if (Math.abs(dx) >= threshold) {
              if (dx < 0) {
                setHeroByIndex(HERO_INDEX + 1); // swipe left -> next
              } else {
                setHeroByIndex(HERO_INDEX - 1); // swipe right -> prev
              }
            }
          } catch (_) {}
        });
      }
    }
    
  } catch (_) { /* no-op */ }

  // =============================
  // Dynamic articles from TypeNews
  // =============================
  // Discover pages named article*.html under each TypeNews category and append
  // them as additional tiles to the existing grid. This keeps the hero and the
  // initial three tiles intact while adding more content below.
  // Include all existing TypeNews categories found in the repo
  const categories = [
    'animation',
    'branding',
    'com_actus',
    // 'edito' is reserved for Hero only
    'formations',
    'outils_astuces',
    'solutions_insights',
    'zoom_materiel'
  ];

  function buildTile({ href, imgSrc, imgAlt, title, desc }) {
    const article = document.createElement('article');
    article.className = 'kyo-tile';

    const link = document.createElement('a');
    link.className = 'kyo-tile-media';
    // Prefer routing through newsletter page using short code
    try {
      if (href && /^\s*TypeNews\//i.test(href)) {
        // Expect TypeNews/<folder>/<file>.html
        const m = href.match(/^\s*TypeNews\/([^\/]+)\/([^\/?#]+)\.(html?)\s*$/i);
        if (m) {
          const folder = m[1];
          const filename = m[2];
          const shortCode = filename.toLowerCase().endsWith(`_${folder.toLowerCase()}`)
            ? filename
            : `${filename}_${folder}`;
          link.href = `newsletter_C.html?article=${encodeURIComponent(shortCode)}`;
        } else {
          link.href = href;
        }
      } else {
        link.href = href || '#';
      }
    } catch (_) {
      link.href = href || '#';
    }

    const img = document.createElement('img');
    if (imgSrc) img.src = imgSrc;
    if (imgAlt) img.alt = imgAlt;
    // Provide the blurred backdrop image via CSS variable
    if (imgSrc) {
      try { link.style.setProperty('--tile-bg', `url("${imgSrc}")`); } catch (_) { /* no-op */ }
    }
    // Performance hints for grid images
    try {
      img.loading = 'lazy';
      img.decoding = 'async';
      img.setAttribute('fetchpriority', 'low');
      // Provide intrinsic dimensions to reduce layout shifts (16:9)
      img.width = 1280; // intrinsic, not CSS size
      img.height = 720;
      // Responsive sizes hint; browser will pick appropriate resource even without srcset
      img.sizes = '(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 100vw';
    } catch (_) { /* no-op */ }

    // Smart-fit: if the intrinsic ratio is close to 16:9, use cover (no bars); otherwise keep contain
    img.addEventListener('load', () => {
      try {
        // Ensure backdrop uses the final resolved src
        try { link.style.setProperty('--tile-bg', `url("${img.currentSrc || img.src}")`); } catch (_) {}
        const nw = img.naturalWidth || 0;
        const nh = img.naturalHeight || 0;
        if (!nw || !nh) return;
        const ratio = nw / nh;
        const target = 16 / 9;
        const diff = Math.abs(ratio - target);
        // Tolerance ~6% difference
        if (diff < 0.1) {
          link.classList.remove('fit-contain');
          link.classList.add('fit-cover');
        } else {
          link.classList.remove('fit-cover');
          link.classList.add('fit-contain');
        }
      } catch (_) { /* ignore */ }
    });
    link.appendChild(img);


    const body = document.createElement('div');
    body.className = 'kyo-tile-body';
    const h3 = document.createElement('h3');
    h3.textContent = title || '';
    const p = document.createElement('p');
    p.textContent = desc || '';
    body.appendChild(h3);
    body.appendChild(p);

    article.appendChild(link);
    article.appendChild(body);
    return article;
  }

  function extractResumeFromDoc(doc) {
    // 1) Any element with inline 22px (not limited to <p>), excluding headers and elements under 52px title
    const candidates22 = doc.querySelectorAll('[style*="font-size: 22px"], [style*="font-size:22px"]');
    for (const el of candidates22) {
      if (el.closest('[style*="font-size: 52px"], [style*="font-size:52px"], h1, h2, h3')) continue;
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
    // 2) Any inline font-size span
    const anyFs = doc.querySelectorAll('[style*="font-size:"]');
    for (const el of anyFs) {
      if (el.closest('[style*="font-size: 52px"], [style*="font-size:52px"], h1, h2, h3')) continue;
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
    // 3) First non-empty paragraph
    const p = Array.from(doc.querySelectorAll('p')).find(x => ((x.innerText || x.textContent || '').replace(/\s+/g, ' ').trim().length > 0));
    return p ? (p.innerText || p.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  async function probeArticle(url) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`);
      if (!res.ok) return null;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = extractTitleFromDoc(doc, 'h1, h2, h3');
      const descText = extractResumeFromDoc(doc);
      // Grid tiles must use an actual <img>. If none, skip this article (prevents video-only pages in grid)
      const imgEl = doc.querySelector('img');
      if (!imgEl) return null;
      const baseUrl = new URL(url, window.location.href);
      const rawSrc = imgEl.getAttribute('src') || imgEl.src || '';
      const imgSrc = rawSrc ? resolveUrl(rawSrc, baseUrl) : '';
      const imgAlt = (imgEl.getAttribute && imgEl.getAttribute('alt')) || '';
      const desc = descText || '';
      return { title, imgSrc, imgAlt, desc };
    } catch (e) {
      return null;
    }
  }

  async function loadTypeNewsArticles(maxPerCategory = 5) {
    const baseGrid = document.querySelector('.cards-grid.kyo-tiles');
    if (!baseGrid) return;
    // Create a separate centered section for dynamic articles ("second column/section")
    let dynGrid = document.querySelector('.cards-grid.kyo-tiles.dynamic-articles');
    if (!dynGrid) {
      dynGrid = document.createElement('section');
      dynGrid.className = 'cards-grid kyo-tiles dynamic-articles';
      // Insert right after the existing grid
      baseGrid.parentNode.insertBefore(dynGrid, baseGrid.nextSibling);
    }
    for (const cat of categories) {
      // Allow gaps in numbering: skip missing ones, and stop only after consecutive misses
      let consecutiveMisses = 0;
      // edito/article1.html is known to be absent in this repo; start at 2 for 'edito' to avoid 404
      const startIndex = (cat === 'edito') ? 2 : 1;
      for (let i = startIndex; i <= maxPerCategory; i++) {
        const url = `TypeNews/${cat}/article${i}_${cat}.html`;
        // Skip the hero source to avoid duplication in the grid
        if (url === 'TypeNews/edito/video1.html') { continue; }
        const data = await probeArticle(url);
        if (data) {
          const tile = buildTile({ href: url, imgSrc: data.imgSrc, imgAlt: data.imgAlt, title: data.title, desc: data.desc });
          dynGrid.appendChild(tile);
          consecutiveMisses = 0; // reset on success
        } else {
          // Skip this number but don't stop the whole category unless repeated misses
          consecutiveMisses++;
          if (consecutiveMisses >= 2) {
            break;
          }
          continue;
        }
      }
    }
  }

  loadTypeNewsArticles();
});

