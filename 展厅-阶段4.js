(() => {
    const carousel = document.querySelector('.mySwiper')?.swiper;
    if (!carousel?.slides.length) return;

    const strip = document.getElementById('exhibit-thumbnails');
    const toggle = document.getElementById('exhibit-thumbnails-toggle');
    const desktop = window.matchMedia('(min-width: 1024px)');
    const mobile = window.matchMedia('(max-width: 767px)');
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

    let expanded = true;
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
    const mobile = window.matchMedia('(max-width: 767px)');
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
