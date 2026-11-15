(() => {
    const stage = document.querySelector('.mySwiper');
    const carousel = stage.swiper;
    const desktop = window.matchMedia('(min-width: 1024px)');

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
