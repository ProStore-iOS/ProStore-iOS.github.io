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

let pulseState = null;
function pulse(state) {
    const img = document.querySelector('.logo-img');
    if (!img) return;

    let startTime;
    const duration = 3000;

    if (state === 'reset') {
        cancelAnimationFrame(pulseState);
        pulseState = null;
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = 'scale(0.8)';
        return;
    }

    if (state === false) {
        cancelAnimationFrame(pulseState);
        pulseState = null;
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = 'scale(1)';
        return;
    }

    // state === true → start smooth pulsing
    cancelAnimationFrame(pulseState);
    startTime = null;

    function animate(time) {
        if (!startTime) startTime = time;
        const elapsed = time - startTime;
        // sinusoidal smooth scaling: 0.8 → 1 → 0.8
        const scale = 0.9 + 0.1 * Math.sin((elapsed / duration) * 2 * Math.PI); 
        img.style.transform = `scale(${scale})`;
        pulseState = requestAnimationFrame(animate);
    }

    pulseState = requestAnimationFrame(animate);
}
