(() => {
    const stage = document.querySelector('.mySwiper');
    const carousel = stage?.swiper;
    if (!carousel) return;

    const mobile = window.matchMedia('(max-width: 767px)');
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
