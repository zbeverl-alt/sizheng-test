(() => {
    const stage = document.querySelector('.mySwiper');
    const carousel = stage.swiper;
    const desktop = window.matchMedia('(min-width: 768px) and (orientation: landscape), (min-width: 1200px) and (orientation: portrait) and (not (pointer: coarse))');

    if (carousel) {
        const syncBackground = () => {
            const image = carousel.slides[carousel.activeIndex]?.querySelector('img');
            if (!desktop.matches || !image?.complete || !image.naturalWidth) {
                stage.style.removeProperty('--exhibit-slide-background');
                return;
            }
            stage.style.setProperty('--exhibit-slide-background', `url("${image.currentSrc}")`);
        };

        stage.addEventListener('load', event => {
            if (event.target.closest('.swiper-slide-active')) syncBackground();
        }, true);
        carousel.on('slideChange', syncBackground);
        desktop.addEventListener('change', syncBackground);
        syncBackground();
    }

    const button = document.getElementById('exhibit-fullscreen');
    const status = document.getElementById('exhibit-fullscreen-status');

    const syncFullscreen = () => {
        button.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
        status.textContent = '';
    };

    button.disabled = !document.fullscreenEnabled;
    if (button.disabled) button.title = '当前浏览器环境不支持全屏';
    document.addEventListener('fullscreenchange', syncFullscreen);

    button.addEventListener('click', async () => {
        status.textContent = '';
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            status.textContent = '无法切换全屏，请检查浏览器设置。';
        }
    });

    syncFullscreen();
})();

(() => {
    const stage = document.querySelector('.mySwiper');
    const carousel = stage?.swiper;
    if (!carousel) return;

    const mobile = window.matchMedia('(max-width: 767px), (orientation: portrait) and (max-width: 1199px), (orientation: portrait) and (pointer: coarse)');
    const openButton = document.getElementById('exhibit-read-button');
    const reader = document.getElementById('exhibit-reader');
    const viewport = reader.querySelector('.exhibit-reader-viewport');
    const image = viewport.querySelector('img');
    const title = reader.querySelector('h2');
    const pointers = new Map();
    let scale = 1;
    let x = 0;
    let y = 0;
    let lastTap;
    let previousSlideTouch;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const render = () => {
        const maxX = Math.max(0, (image.offsetWidth * scale - viewport.clientWidth) / 2);
        const maxY = Math.max(0, (image.offsetHeight * scale - viewport.clientHeight) / 2);
        x = clamp(x, -maxX, maxX);
        y = clamp(y, -maxY, maxY);
        image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };

    const zoomAt = (nextScale, from, to = from) => {
        const rect = viewport.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        nextScale = clamp(nextScale, 1, 6);
        const ratio = nextScale / scale;
        x = to.x - centerX - (from.x - centerX - x) * ratio;
        y = to.y - centerY - (from.y - centerY - y) * ratio;
        scale = nextScale;
        render();
    };

    const reset = () => {
        scale = 1;
        x = y = 0;
        render();
    };

    const activeImage = () => carousel.slides[carousel.activeIndex]?.querySelector('img');
    const syncPage = () => {
        const current = activeImage();
        const ready = current?.complete && current.naturalWidth > 0;
        openButton.hidden = !mobile.matches || !ready;
        if (mobile.matches && ready) {
            stage.style.setProperty('--exhibit-mobile-background', `url("${current.currentSrc}")`);
        } else {
            stage.style.removeProperty('--exhibit-mobile-background');
        }
    };

    const openReader = () => {
        if (!mobile.matches || openButton.hidden || reader.open) return;
        const current = activeImage();
        image.src = current.currentSrc;
        image.alt = current.alt;
        title.textContent = `放大阅读 · ${current.alt}`;
        reader.showModal();
        previousSlideTouch = carousel.allowTouchMove;
        carousel.allowTouchMove = false;
        reset();
        scale = 2.5;
        render();
    };

    const closeReader = () => {
        if (!reader.open) return;
        reset();
        carousel.allowTouchMove = previousSlideTouch;
        pointers.clear();
        lastTap = undefined;
        reader.close();
    };

    openButton.addEventListener('click', openReader);
    reader.querySelector('[data-close-reader]').addEventListener('click', closeReader);
    reader.querySelector('[data-reset-reader]').addEventListener('click', reset);
    reader.addEventListener('cancel', event => {
        event.preventDefault();
        closeReader();
    });
    image.addEventListener('load', render);
    window.addEventListener('resize', render);
    mobile.addEventListener('change', () => {
        if (!mobile.matches) closeReader();
        syncPage();
    });

    const point = event => ({ x: event.clientX, y: event.clientY });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    viewport.addEventListener('pointerdown', event => {
        if (event.button !== 0 || pointers.size >= 2) return;
        viewport.setPointerCapture(event.pointerId);
        const position = point(event);
        pointers.set(event.pointerId, { position, start: position, tap: pointers.size === 0 });
        if (pointers.size === 2) {
            lastTap = undefined;
            for (const finger of pointers.values()) finger.tap = false;
        }
    });

    viewport.addEventListener('pointermove', event => {
        const finger = pointers.get(event.pointerId);
        if (!finger) return;
        const previous = finger.position;
        finger.position = point(event);
        if (distance(finger.start, finger.position) > 8) finger.tap = false;
        if (pointers.size === 2) {
            const other = [...pointers.values()].find(item => item !== finger).position;
            const before = distance(previous, other);
            if (before > 0) {
                zoomAt(scale * distance(finger.position, other) / before,
                    middle(previous, other), middle(finger.position, other));
            }
        } else {
            x += finger.position.x - previous.x;
            y += finger.position.y - previous.y;
            render();
        }
    });

    viewport.addEventListener('pointerup', event => {
        const finger = pointers.get(event.pointerId);
        pointers.delete(event.pointerId);
        if (!finger?.tap) return;
        const now = performance.now();
        const position = point(event);
        if (lastTap && now - lastTap.time < 325 && distance(position, lastTap.position) < 28) {
            if (scale > 1) reset();
            else zoomAt(2.5, position);
            lastTap = undefined;
        } else {
            lastTap = { time: now, position };
        }
    });

    for (const eventName of ['pointercancel', 'lostpointercapture']) {
        viewport.addEventListener(eventName, event => pointers.delete(event.pointerId));
    }

    stage.addEventListener('load', syncPage, true);
    carousel.on('slideChange', () => {
        closeReader();
        syncPage();
    });
    carousel.on('doubleTap', (_, event) => {
        if (event?.target === activeImage()) openReader();
    });

    syncPage();
})();

(() => {
    const carousel = document.querySelector('.mySwiper')?.swiper;
    if (!carousel?.slides.length) return;

    const strip = document.getElementById('exhibit-thumbnails');
    const toggle = document.getElementById('exhibit-thumbnails-toggle');
    const desktop = window.matchMedia('(min-width: 768px) and (orientation: landscape), (min-width: 1200px) and (orientation: portrait) and (not (pointer: coarse))');
    const mobile = window.matchMedia('(max-width: 767px), (orientation: portrait) and (max-width: 1199px), (orientation: portrait) and (pointer: coarse)');
    const aiModal = document.getElementById('aiModal');
    const buttons = carousel.slides.map((slide, index) => {
        const page = String(index + 1).padStart(2, '0');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'exhibit-thumbnail';
        button.setAttribute('aria-label', `第 ${page} 页`);

        const image = document.createElement('img');
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.src = `大学生讲思政课(2)_${page}.png`;

        button.append(image, page);
        button.addEventListener('click', () => {
            if (mobile.matches) {
                mobileExpanded = false;
                updateVisibility();
                toggle.focus({ preventScroll: true });
            }
            carousel.slideTo(index);
        });
        return button;
    });
    strip.append(...buttons);

    const reveal = button => {
        const viewport = strip.getBoundingClientRect();
        const item = button.getBoundingClientRect();
        const gutter = 12;
        if (item.left < viewport.left + gutter) {
            strip.scrollLeft += item.left - viewport.left - gutter;
        } else if (item.right > viewport.right - gutter) {
            strip.scrollLeft += item.right - viewport.right + gutter;
        }
    };

    let selected;
    const sync = () => {
        selected?.removeAttribute('aria-current');
        selected = buttons[carousel.activeIndex];
        if (!selected) return;
        selected.setAttribute('aria-current', 'page');
        if (!strip.hidden) reveal(selected);
    };

    const tablet = window.matchMedia('(max-width: 1199px), (pointer: coarse)');
    let expanded = !tablet.matches;
    tablet.addEventListener('change', () => {
        expanded = !tablet.matches;
        updateVisibility();
    });
    let mobileExpanded = false;
    const updateVisibility = () => {
        const open = (desktop.matches && expanded) || (mobile.matches && mobileExpanded);
        strip.hidden = !open;
        toggle.hidden = !desktop.matches && !mobile.matches;
        toggle.textContent = open ? '收起缩略图' : '展开缩略图';
        toggle.setAttribute('aria-expanded', String(open));
        document.body.dataset.exhibitThumbnails = open ? 'open' : 'closed';
        carousel.update();
        sync();
    };

    toggle.addEventListener('click', () => {
        if (mobile.matches) {
            mobileExpanded = !mobileExpanded;
            if (mobileExpanded) aiModal.classList.remove('active');
        } else {
            expanded = !expanded;
        }
        updateVisibility();
    });
    strip.addEventListener('wheel', event => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || !event.deltaY || event.ctrlKey) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? strip.clientWidth : 1;
        strip.scrollLeft += event.deltaY * unit;
    }, { passive: false });
    carousel.on('slideChange', sync);
    desktop.addEventListener('change', updateVisibility);
    mobile.addEventListener('change', () => {
        mobileExpanded = false;
        updateVisibility();
    });
    new MutationObserver(() => {
        if (mobile.matches && mobileExpanded && aiModal.classList.contains('active')) {
            mobileExpanded = false;
            updateVisibility();
        }
    }).observe(aiModal, { attributes: true, attributeFilter: ['class'] });
    updateVisibility();
})();

(() => {
    const mobile = window.matchMedia('(max-width: 767px), (orientation: portrait) and (max-width: 1199px), (orientation: portrait) and (pointer: coarse)');
    const modal = document.getElementById('aiModal');
    const input = document.getElementById('aiInput');
    const messages = document.getElementById('aiMessages');
    const viewport = window.visualViewport;

    const syncViewport = () => {
        const visible = viewport?.height ?? window.innerHeight;
        const inset = Math.max(0, document.documentElement.clientHeight - visible - (viewport?.offsetTop ?? 0));
        const focused = document.activeElement === input;
        const keyboard = mobile.matches && modal.classList.contains('active')
            && focused && (inset > 80 || document.documentElement.clientHeight - visible > 80
                || window.innerHeight < heightBeforeInput - 80);

        document.body.toggleAttribute('data-exhibit-keyboard', keyboard);
        modal.style.setProperty('--exhibit-visible-height', `${visible}px`);
        modal.style.setProperty('--exhibit-viewport-inset', `${inset}px`);
        if (keyboard) messages.scrollTop = messages.scrollHeight;
    };

    let heightBeforeInput = window.innerHeight;
    input.addEventListener('focus', () => {
        heightBeforeInput = window.innerHeight;
        syncViewport();
    });
    input.addEventListener('blur', syncViewport);
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    mobile.addEventListener('change', syncViewport);
    new MutationObserver(syncViewport).observe(modal, { attributes: true, attributeFilter: ['class'] });
    syncViewport();
})();
