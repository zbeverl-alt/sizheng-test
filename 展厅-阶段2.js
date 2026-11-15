(() => {
    const carousel = document.querySelector('.mySwiper')?.swiper;
    if (!carousel?.slides.length) return;

    const strip = document.getElementById('exhibit-thumbnails');
    const toggle = document.getElementById('exhibit-thumbnails-toggle');
    const desktop = window.matchMedia('(min-width: 1024px)');
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
        button.addEventListener('click', () => carousel.slideTo(index));
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
        if (desktop.matches && !strip.hidden) reveal(selected);
    };

    let expanded = true;
    const updateVisibility = () => {
        const open = desktop.matches && expanded;
        strip.hidden = !open;
        toggle.hidden = !desktop.matches;
        toggle.textContent = open ? '收起缩略图' : '展开缩略图';
        toggle.setAttribute('aria-expanded', String(open));
        document.body.dataset.exhibitThumbnails = open ? 'open' : 'closed';
        carousel.update();
        sync();
    };

    toggle.addEventListener('click', () => {
        expanded = !expanded;
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
    updateVisibility();
})();
