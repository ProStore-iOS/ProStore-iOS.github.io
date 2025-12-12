function loadingImg(phase) {
    const img = document.querySelector('.logo-img');
    if (!img) return;

    phase = Math.max(0, Math.min(phase, 100));
    const degrees = (phase / 100) * 360;

    img.style.webkitMaskImage = `conic-gradient(rgba(255,255,255,1) 0deg ${degrees}deg, rgba(255,255,255,0.7) ${degrees}deg 360deg)`;
    img.style.maskImage = `conic-gradient(rgba(255,255,255,1) 0deg ${degrees}deg, rgba(255,255,255,0.7) ${degrees}deg 360deg)`;
    img.style.webkitMaskRepeat = 'no-repeat';
    img.style.maskRepeat = 'no-repeat';
    img.style.webkitMaskPosition = 'center';
    img.style.maskPosition = 'center';
    img.style.webkitMaskSize = 'contain';
    img.style.maskSize = 'contain';
}

let pulseInterval = null;
function pulse(state) {
    const img = document.querySelector('.logo-img');
    if (!img) return;

    if (state === 'reset') {
        clearInterval(pulseInterval);
        pulseInterval = null;
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = 'scale(0.8)';
    } else if (state === true) {
        if (pulseInterval) return; // already pulsing
        let growing = true;
        img.style.transition = 'transform 0.2s ease';
        pulseInterval = setInterval(() => {
            img.style.transform = growing ? 'scale(1)' : 'scale(0.8)';
            growing = !growing;
        }, 200);
    } else if (state === false) {
        if (pulseInterval) {
            clearInterval(pulseInterval);
            pulseInterval = null;
        }
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = 'scale(1)';
    }
}
