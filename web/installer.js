function loadingImg(phase) {
    const img = document.querySelector('.logo-img');
    if (!img) return;

    // Clamp phase between 0 and 100
    phase = Math.max(0, Math.min(phase, 100));

    // Convert phase to degrees
    const degrees = (phase / 100) * 360;

    // White = fully visible, semi-transparent = 70% opacity
    img.style.webkitMaskImage = `conic-gradient(rgba(255,255,255,1) 0deg ${degrees}deg, rgba(255,255,255,0.7) ${degrees}deg 360deg)`;
    img.style.maskImage = `conic-gradient(rgba(255,255,255,1) 0deg ${degrees}deg, rgba(255,255,255,0.7) ${degrees}deg 360deg)`;
    img.style.webkitMaskRepeat = 'no-repeat';
    img.style.maskRepeat = 'no-repeat';
    img.style.webkitMaskPosition = 'center';
    img.style.maskPosition = 'center';
    img.style.webkitMaskSize = 'contain';
    img.style.maskSize = 'contain';
}
