// Map film keys to their actual clip filenames
const clipFileMap = {
  'conversation-among-the-ruins': 'conversations-from-the-ruins-clip.mp4',
  'life-is-elsewhere': 'life-is-elsewhere-clip.mp4',
  'under-the-skin': 'under-the-skin-clip.mp4',
  'scenes-from-life': 'scenes-from-life-clip.mp4'
};

function buildHeroSection(reel, films) {
  return `
    <section class="hero">
      <div class="video-container">
        <iframe 
          id="hero-video-iframe"
          src="https://player.vimeo.com/video/${reel}?background=1&autoplay=1&loop=1&byline=0&title=0&portrait=0&muted=1"
          frameborder="0"
          allow="autoplay"
          webkitallowfullscreen
          mozallowfullscreen
          allowfullscreen
        ></iframe>
        <video
          id="hero-video-local"
          autoplay
          muted
          loop
          playsinline
          style="opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
        ></video>
      </div>
      <div class="film-titles">
        ${Object.keys(films).map(key => `
        <h2 data-clip-file="${clipFileMap[key]}"><a href="#">${films[key].title}</a></h2>
        `).join('')}
      </div>
    </section>
  `;
}
/* <h2 data-clip-file="${clipFileMap[key]}"><a href="./${key}.html">${films[key].title}</a></h2> */
class HybridVideoManager {
  constructor() {
    this.vimeoIframe = null;
    this.localVideo = null;
    this.transitionDuration = 800; // ms for cinematic fade
    this.currentlyShowingLocal = false;
    this.isTransitioning = false;
    this.videoCache = new Map();

    this.initializeElements();
  }

  initializeElements() {
    this.vimeoIframe = document.getElementById('hero-video-iframe');
    this.localVideo = document.getElementById('hero-video-local');
    if (!this.vimeoIframe || !this.localVideo) {
      console.error('Video elements not found');
      return;
    }

    // Configure local video element
    Object.assign(this.localVideo, {
      muted: true,
      loop: true,
      playsInline: true,
      preload: 'none'
    });

    this.localVideo.addEventListener('error', e => {
      console.warn('Local video error:', e.target.error);
    });

    console.log('Video elements initialized successfully');
  }

  // Generic crossfade between two elements
  crossfadeElements(fromEl, toEl) {
    return new Promise(resolve => {
      const duration = this.transitionDuration;
      const start = performance.now();

      // Ensure starting styles
      fromEl.style.transition = 'none';
      toEl.style.transition = 'none';
      toEl.style.opacity = '0';

      requestAnimationFrame(function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // easeInOut quad
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        fromEl.style.opacity = 1 - ease;
        toEl.style.opacity = ease;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      });
    });
  }

  preloadVideo(clipFile) {
    const videoPath = `./static/${clipFile}`;
    if (this.videoCache.has(videoPath)) {
      return Promise.resolve(this.videoCache.get(videoPath));
    }
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      Object.assign(video, {
        muted: true,
        loop: true,
        playsInline: true,
        preload: 'auto'
      });

      const timeoutId = setTimeout(() => {
        reject(new Error(`Preload timeout: ${videoPath}`));
      }, 10000);

      video.addEventListener('loadeddata', () => {
        clearTimeout(timeoutId);
        this.videoCache.set(videoPath, video);
        console.log('Video preloaded:', videoPath);
        resolve(video);
      });
      video.addEventListener('error', e => {
        clearTimeout(timeoutId);
        console.error('Preload error:', e.target.error);
        reject(new Error(`Preload failed: ${videoPath}`));
      });

      video.src = videoPath;
    });
  }

  async switchToLocalVideo(clipFile) {
    if (this.isTransitioning || !clipFile) return;
    this.isTransitioning = true;

    try {
      const videoPath = `./static/${clipFile}`;
      let sourceVideo;
      if (this.videoCache.has(videoPath)) {
        sourceVideo = this.videoCache.get(videoPath);
      } else {
        sourceVideo = await this.preloadVideo(clipFile);
      }

      sourceVideo.currentTime = 0;
      sourceVideo.style.opacity = '0';

      const container = this.vimeoIframe.parentElement;
      container.appendChild(sourceVideo);

      // Ensure play
      try {
        await sourceVideo.play();
      } catch (e) {
        sourceVideo.muted = true;
        await sourceVideo.play();
      }

      if (this.currentlyShowingLocal) {
        // Fade from current local to new clip
        await this.crossfadeElements(this.localVideo, sourceVideo);
        this.localVideo.pause();
        this.localVideo.remove();
      } else {
        // Fade from Vimeo to new clip
        // Pause background
        this.vimeoIframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
        await this.crossfadeElements(this.vimeoIframe, sourceVideo);
      }

      // Set new local as active
      this.localVideo = sourceVideo;
      this.currentlyShowingLocal = true;
      console.log('Switched to local clip:', clipFile);
    } catch (error) {
      console.warn('Failed to switch to local video:', error);
      this.vimeoIframe.style.opacity = '1';
    } finally {
      this.isTransitioning = false;
    }
  }

  async switchToVimeo() {
    if (this.isTransitioning || !this.currentlyShowingLocal) return;
    this.isTransitioning = true;

    try {
      // Resume background
      this.vimeoIframe.contentWindow.postMessage(JSON.stringify({ method: 'play' }), '*');
      await this.crossfadeElements(this.localVideo, this.vimeoIframe);

      this.localVideo.pause();
      this.localVideo.remove();
      this.currentlyShowingLocal = false;
      console.log('Switched back to Vimeo');
    } catch (error) {
      console.warn('Failed to switch to Vimeo:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  preloadAllVideos(clipFiles) {
    console.log('Starting video preload for', clipFiles.length, 'videos');
    clipFiles.forEach((clipFile, idx) => {
      setTimeout(() => {
        this.preloadVideo(clipFile).catch(err => console.warn(`Failed to preload ${clipFile}:`, err));
      }, idx * 500);
    });
  }

  cleanup() {
    if (this.localVideo) {
      this.localVideo.pause();
      this.localVideo.src = '';
      this.localVideo.load();
    }
    this.videoCache.forEach(video => {
      video.pause();
      video.src = '';
      video.load();
    });
    this.videoCache.clear();
  }
}

function initializeHeroHovers(reel) {
  const manager = new HybridVideoManager();
  const $titles = $('.film-titles h2');
  let currentState = 'vimeo';
  let pendingState = null;
  let hoverTimeout = null;

  const STABILIZATION_DELAY = 500;
  const clipFiles = [];
  $titles.each(function() {
    clipFiles.push($(this).data('clip-file'));
  });

  // Preload after initial delay
  setTimeout(() => manager.preloadAllVideos(clipFiles), 2000);

  function requestStateChange(state) {
    clearTimeout(hoverTimeout);
    pendingState = state;
    if (state === currentState) {
      pendingState = null;
      return;
    }
    hoverTimeout = setTimeout(executeStateChange, STABILIZATION_DELAY);
  }

  async function executeStateChange() {
    if (!pendingState || manager.isTransitioning) return;
    const target = pendingState;
    pendingState = null;
    try {
      if (target === 'vimeo') {
        await manager.switchToVimeo();
      } else {
        await manager.switchToLocalVideo(target);
      }
      currentState = target;
    } catch (e) {
      console.warn('State change error:', e);
    } finally {
      if (pendingState && pendingState !== currentState) {
        executeStateChange();
      }
    }
  }

  $titles.each(function() {
    const $t = $(this);
    const clip = $t.data('clip-file');
    if (!clip) return;

    $t.on('mouseenter', () => {
      $t.addClass('loading');
      requestStateChange(clip);
    });
    $t.on('mouseleave', () => {
      $t.removeClass('loading');
      requestStateChange('vimeo');
    });
  });

  $('.film-titles').on('mouseleave', () => requestStateChange('vimeo'));
  window.addEventListener('beforeunload', () => {
    clearTimeout(hoverTimeout);
    manager.cleanup();
  });

  window.videoManager = manager;
}

function getPageTitle() {
  const page = window.location.pathname.split('/').pop();
  return page.replace(/\.html$/, '').replace(/-/g, ' ');
}

function buildFilmCardGallery(films) {
    // Build detailed film cards
    return `
        <section class="film-card-gallery">
            ${Object.entries(films).map(([title, film]) => `
                <div class="film-card">
                    <h3>${title} (${film.year})</h3>
                    <p>${film.shortDescription}</p>
                    <div class="metadata">
                        <span class="duration">${film.duration}</span>
                        ${film.awards ? `<div class="awards">${film.awards.join(', ')}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </section>
    `;
}

function buildProfileSection(profile) {
    return `
        <section class="profile">
            <img src="${profile.image}" alt="${profile.name}">
            <div class="bio">
                <h2>${profile.name}</h2>
                <p>${profile.bio}</p>
            </div>
        </section>
    `;
}

function buildNavigation(films) {
    return `
        <nav class="navigation">
            <li><a href="./about.html">About</a></li>
            <li><a href="./credits.html">Credits</a></li>
            <li><a href="./reel.html">Reel</a></li>
            <li class="dropdown">
                <a href="/films">Films</a>
                <ul class="dropdown-menu">
                    ${Object.keys(films).map(url => `
                        <li><a href="./${url}.html">${films[url].title}</a></li>
                    `).join('')}
                </ul>
            </li>
        </nav>
    `;
}

function buildStillGallery(stills) {
    return `
        <section class="still-gallery">
            ${stills.map(still => `
                <div class="still">
                    <img src="${still.image}" alt="${still.description}">
                    <p>${still.description}</p>
                </div>
            `).join('')}
        </section>
    `;
}

function buildTrailerViewer(trailer, title) {
    return `
        <section class="trailer-viewer">
            <iframe src="https://player.vimeo.com/video/${trailer}?title=0&byline=0&portrait=0&logo=0&playbar=0&volume=1&settings=1&fullscreen=1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen title="${title} - Trailer"></iframe>
        </section>
    `;
}

function buildFilmDetails(description) {
    return `
        <section class="film-details">
            <p>${description}</p>
        </section>
    `;
}

function buildAwardsSection(awards) {
    return `
        <section class="awards">
            <h2>Awards</h2>
            <ul>
                ${awards.map(award => `<li>${award}</li>`).join('')}
            </ul>
        </section>
    `;
}

function buildSocialLinks(links) {
    return `
        <section class="social-links">
            <h2>Follow Me</h2>
            <ul>
                ${Object.entries(links).map(([platform, url]) => `
                    <li><a href="${url}" target="_blank">${platform}</a></li>
                `).join('')}
            </ul>
        </section>
    `;
}
