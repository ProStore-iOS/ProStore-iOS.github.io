function loadingImg(phase) {
    const img = document.querySelector('.logo-img');
    if (!img) return;

    // Clamp phase between 0 and 100
    phase = Math.max(0, Math.min(phase, 100));

    // Convert phase to degrees (0% = 0deg, 100% = 360deg)
    const degrees = (phase / 100) * 360;

    // Create a conic gradient mask for the reveal
    // Transparent part = hidden, white part = visible
    img.style.webkitMaskImage = `conic-gradient(white 0deg ${degrees}deg, rgba(255,255,255,0) ${degrees}deg 360deg)`;
    img.style.maskImage = `conic-gradient(white 0deg ${degrees}deg, rgba(255,255,255,0) ${degrees}deg 360deg)`;
    img.style.webkitMaskRepeat = 'no-repeat';
    img.style.maskRepeat = 'no-repeat';
    img.style.webkitMaskPosition = 'center';
    img.style.maskPosition = 'center';
    img.style.webkitMaskSize = 'contain';
    img.style.maskSize = 'contain';
}
