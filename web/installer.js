let currentPhase = 0; // current displayed phase
let targetPhase = 0;  // target phase you want to reach

function loadingImg(phase) {
    targetPhase = Math.max(0, Math.min(phase, 100));
    animatePhase();
}

let animating = false;

function animatePhase() {
    if (animating) return; // prevent multiple loops
    animating = true;

    function step() {
        const img = document.querySelector('.logo-img');
        if (!img) {
            animating = false;
            return;
        }

        // smooth approach using linear interpolation
        currentPhase += (targetPhase - currentPhase) * 0.05; // 0.05 = smoothing factor
        if (Math.abs(currentPhase - targetPhase) < 0.1) currentPhase = targetPhase;

        const degrees = (currentPhase / 100) * 360;

        img.style.webkitMaskImage = `conic-gradient(rgba(255,255,255,1) 0deg ${degrees}deg, rgba(255,255,255,0.7) ${degrees}deg 360deg)`;
        img.style.maskImage = `conic-gradient(rgba(255,255,255,1) 0deg ${degrees}deg, rgba(255,255,255,0.7) ${degrees}deg 360deg)`;

        img.style.webkitMaskRepeat = 'no-repeat';
        img.style.maskRepeat = 'no-repeat';
        img.style.webkitMaskPosition = 'center';
        img.style.maskPosition = 'center';
        img.style.webkitMaskSize = 'contain';
        img.style.maskSize = 'contain';

        if (currentPhase !== targetPhase) {
            requestAnimationFrame(step);
        } else {
            animating = false;
        }
    }

    requestAnimationFrame(step);
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



// INSTALLER
let installer = (function () {
  // Config defaults (change if you need)
  const PREFLIGHT_URL = "https://ipa.s0n1c.ca/preflight";
  const INSTALL_BASE = "https://ipa.s0n1c.ca";
  const DEFAULT_REPO = "ProStore-iOS/ProStore"; // repo to inspect by default
  const README_RAW = "https://raw.githubusercontent.com/ProStore-iOS/certificates/refs/heads/main/README.md";

  // internal state
  let _progress = 0;           // 0..100
  let _finished = false;
  let _lastError = null;
  let _installData = null;     // response from preflight (contains id, name, version, etc.)
  let _chosenAsset = null;     // metadata about chosen release asset
  let _releaseInfo = null;     // chosen release object

  // helpers
  function _setProgress(n) {
    _progress = Math.max(0, Math.min(100, Math.round(n)));
  }

  function _chooseAssetFromRelease(release) {
    const assets = Array.isArray(release.assets) ? release.assets : [];
    // candidate .ipa assets
    const ipaAssets = assets.filter(a => a && a.name && /\.ipa$/i.test(a.name));
    if (!ipaAssets.length) return null;
    // prefer those with "signed" in the filename
    const signed = ipaAssets.filter(a => /signed/i.test(a.name));
    if (signed.length) return signed[0];
    // fallback: return the first ipa asset
    return ipaAssets[0];
  }

  async function _fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = `HTTP ${res.status}${text ? " - " + text : ""}`;
      const e = new Error(msg);
      e.status = res.status;
      throw e;
    }
    return res.json();
  }

  async function _fetchText(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = `HTTP ${res.status}${text ? " - " + text : ""}`;
      const e = new Error(msg);
      e.status = res.status;
      throw e;
    }
    return res.text();
  }

  // Try to fetch the README and extract the Recommend Certificate short name
  async function _getRecommendedCertificate() {
    try {
      const raw = await _fetchText(README_RAW);
      // Grab the Recommend Certificate section (everything after its heading until next '---' or next heading)
      const sectionMatch = raw.match(/#\s*Recommend Certificate\s*([\s\S]*?)(?:\n---|\n#|$)/i);
      const section = sectionMatch ? sectionMatch[1] : raw;

      // Find the first bold line inside that section: **...**
      const boldMatch = section.match(/\*\*(.+?)\*\*/);
      if (!boldMatch) return null;

      let rec = boldMatch[1].trim();
      // Remove trailing " - ❌ Revoked" or any " - ..." suffix
      rec = rec.replace(/['"“”]/g, '').split(/\s*-\s*/)[0].trim();
      if (!rec) return null;
      console.log("Recommended certificate parsed from README:", rec);
      return rec;
    } catch (e) {
      console.warn("Failed to fetch/parse recommended certificate README:", e);
      return null;
    }
  }

  return {
    // Return percentage (integer)
    getStatus: function () {
      return _progress;
    },

    // Begin the install flow (auto-select release & preferred asset)
    // options: { repo: "owner/repo", token: "GITHUB_PAT (optional)", preferPrerelease: false }
    // Returns a Promise that resolves to the final preflight response object when finished.
    beginInstall: async function (options = {}) {
      const repo = options.repo || DEFAULT_REPO;
      const token = options.token || null;
      const preferPrerelease = !!options.preferPrerelease;

      _finished = false;
      _lastError = null;
      _installData = null;
      _chosenAsset = null;
      _releaseInfo = null;
      _setProgress(5);

      try {
        _setProgress(12);
        // get releases (latest first)
        const apiUrl = `https://api.github.com/repos/${repo}/releases?per_page=50`;
        const headers = {
          Accept: "application/vnd.github.v3+json",
          ...(token ? { Authorization: `token ${token}` } : {})
        };

        _setProgress(18);

        const releases = await _fetchJson(apiUrl, { headers });
        if (!Array.isArray(releases) || releases.length === 0) {
          throw new Error("No releases returned from GitHub.");
        }

        // filter out drafts; optionally include prereleases if user requested
        const visible = releases
          .filter(r => !r.draft)
          .filter(r => preferPrerelease ? true : !r.prerelease)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // If no visible after filtering, fallback to non-draft
        let defaultRelease = null;
        if (!visible.length) {
          const fallback = releases.filter(r => !r.draft).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          if (!fallback.length) throw new Error("No suitable releases found (all drafts?).");
          defaultRelease = fallback[0];
        } else {
          defaultRelease = visible[0];
        }

        _setProgress(30);

        // TRY: get recommended certificate name from README and find matching release
        let chosenRelease = null;
        try {
          const recommended = await _getRecommendedCertificate();
          if (recommended) {
            // Try to find a release that mentions the recommended certificate in name, tag_name or body
const normalise = s =>
  s.toLowerCase()
   .replace(/[^a-z0-9]+/g, ' ')
   .trim();

const recNorm = normalise(recommended);

const found = releases.find(r => {
  const textHay = normalise(
    (r.name || "") + " " +
    (r.tag_name || "") + " " +
    (r.body || "")
  );

  if (textHay.includes(recNorm)) return true;

  // 🔥 CHECK ASSET FILENAMES (THIS WAS MISSING)
  if (Array.isArray(r.assets)) {
    return r.assets.some(a =>
      a.name && normalise(a.name).includes(recNorm)
    );
  }

  return false;
});
            if (found) {
              chosenRelease = found;
              console.log("Using release matched to recommended certificate:", chosenRelease.name || chosenRelease.tag_name);
            } else {
              console.log("Recommended certificate not found in releases; will fall back to latest release.");
            }
          } else {
            console.log("No recommended certificate parsed; using latest release fallback.");
          }
        } catch (e) {
          console.warn("Error while trying to apply recommended certificate logic:", e);
        }

        // If we didn't pick a recommended release, use the default latest/visible
        _releaseInfo = chosenRelease || defaultRelease;

        _setProgress(45);

        // pick an asset (prefer "signed" .ipa)
        let chosen = _chooseAssetFromRelease(_releaseInfo);
        if (!chosen) {
          // If the chosen release didn't have an ipa, try to fallback to the visible list to find any release with an .ipa
          const otherWithIpa = (visible.length ? visible : releases).find(r => _chooseAssetFromRelease(r));
          if (otherWithIpa) {
            _releaseInfo = otherWithIpa;
            chosen = _chooseAssetFromRelease(otherWithIpa);
          }
        }

        if (!chosen) throw new Error("No .ipa assets found in the selected release(s).");
        _chosenAsset = chosen;

        _setProgress(60);

        // Prepare signing using preflight endpoint (same as original flow)
        const ipaUrl = chosen.browser_download_url;
        if (!ipaUrl) throw new Error("Chosen asset has no browser_download_url.");

        _setProgress(75);

        const resp = await fetch(PREFLIGHT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: ipaUrl })
        });

        if (!resp.ok) {
          const t = await resp.text().catch(() => "");
          throw new Error(`Signing service error HTTP ${resp.status} ${t}`);
        }

        const data = await resp.json();
        if (!data || !data.id) throw new Error("Signing/preflight response did not include an id.");

        _installData = data;
        _setProgress(90);

        // finalise
        _finished = true;
        _setProgress(100);

        return data; // contains id, name, version, etc.
      } catch (err) {
        _lastError = err;
        _finished = false;
        _setProgress(0);
        throw err;
      }
    },

    // When the flow is finished, returns the itms-services link string (or null if not finished).
    // The returned link uses the same install path as the original flow:
    // itms-services://?action=download-manifest&url=<encoded INSTALL_BASE>/<id>/manifest.plist
    getInstallLink: function () {
      if (!_finished || !_installData || !_installData.id) return null;
      const manifestUrl = `${INSTALL_BASE}/${_installData.id}/manifest.plist`;
      return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
    },

    // Optional helpers for debugging / info
    getChosenAsset: function () {
      return _chosenAsset;
    },
    getReleaseInfo: function () {
      return _releaseInfo;
    },
    getLastError: function () {
      return _lastError;
    }
  };
})();

let _downloadInterval = null;

async function startDownload() {
    const dlBtn = document.querySelector('.download-button');
    const installBtn = document.querySelector('.install-button');
    if (!dlBtn || !installBtn) return;

    // UI: disable download and show immediate feedback
    dlBtn.disabled = true;
    dlBtn.textContent = 'Downloading...';
    pulse(true);
    loadingImg(0);

    // start a short interval to update progress UI from installer.getStatus()
    _downloadInterval = setInterval(() => {
        const status = installer.getStatus(); // 0..100
        loadingImg(status);
        dlBtn.textContent = `Downloading... ${status}%`;
    }, 500);

    try {
        // start the install flow (returns preflight info when finished)
        const data = await installer.beginInstall({ repo: "ProStore-iOS/ProStore", token: null });

        // finished: stop polling and show install button instead of redirect
        clearInterval(_downloadInterval);
        _downloadInterval = null;
        loadingImg(100);
        pulse(false);

        // swap the download button for the install button
        dlBtn.style.display = 'none';
        installBtn.style.display = '';
        installBtn.disabled = false;
        installBtn.textContent = 'Install'; // could show version/name if you want

        // Optionally store data somewhere or show extra info:
        // console.log('Preflight data:', data);
    } catch (err) {
        // error handling: re-enable button, clear polling, show message
        clearInterval(_downloadInterval);
        _downloadInterval = null;
        pulse(false);
        loadingImg(0);

        dlBtn.disabled = false;
        dlBtn.textContent = 'Download';
        console.error('Install failed:', err);
        alert('Download failed: ' + (err && err.message ? err.message : err));
    }
}

// When the user clicks Install, run the itms-services link
function performInstall() {
    const installBtn = document.querySelector('.install-button');
    if (!installBtn) return;

    const link = installer.getInstallLink();
    if (!link) {
        alert('Install link not available. Please try Download again.');
        return;
    }

    installBtn.disabled = true;
    installBtn.textContent = 'Installing...';

    // Trigger the itms-services install
    window.location.href = link;
}
