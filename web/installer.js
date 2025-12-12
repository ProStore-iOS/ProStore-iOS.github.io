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



// INSTALLER
let installer = (function () {
  // Config defaults (change if you need)
  const PREFLIGHT_URL = "https://ipa.s0n1c.ca/preflight";
  const INSTALL_BASE = "https://ipa.s0n1c.ca";
  const DEFAULT_REPO = "ProStore-iOS/ProStore"; // repo to inspect by default

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

  return {
    // Return percentage (integer)
    getStatus: function () {
      return _progress;
    },

    // Begin the install flow (auto-select latest release & preferred asset)
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

        if (!visible.length) {
          // if strict filter removed everything, try less strict (non-draft)
          const fallback = releases.filter(r => !r.draft).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          if (!fallback.length) throw new Error("No suitable releases found (all drafts?).");
          _releaseInfo = fallback[0];
        } else {
          _releaseInfo = visible[0]; // latest
        }

        _setProgress(30);

        // pick an asset (prefer "signed" .ipa)
        const chosen = _chooseAssetFromRelease(_releaseInfo);
        if (!chosen) throw new Error("No .ipa assets found in the latest release.");
        _chosenAsset = chosen;

        _setProgress(45);

        // Prepare signing using preflight endpoint (same as original flow)
        const ipaUrl = chosen.browser_download_url;
        if (!ipaUrl) throw new Error("Chosen asset has no browser_download_url.");

        _setProgress(60);

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
    // itms-services://?action=download-manifest&url=<encoded INSTALL_BASE>/<id>/install
    getInstallLink: function () {
      if (!_finished || !_installData || !_installData.id) return null;
      const manifestUrl = `${INSTALL_BASE}/${_installData.id}/install`;
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

function install() {
    pulse(true);
    loadingImg(0);

    // start polling every 0.5s immediately
    const interval = setInterval(() => {
        const status = installer.getStatus(); // % progress
        console.log("Progress:", status, "%");
        loadingImg(status);

        // stop when finished
        if (status >= 100 || installer.isFinished) {
            clearInterval(interval);
            console.log("Install finished!");
            console.log(installer.getInstallLink());
            pulse(false);
        }
    }, 500);

    // start the install
    installer.beginInstall({ repo: "ProStore-iOS/ProStore", token: null })
        .catch(err => {
            console.error("Install failed:", err);
            clearInterval(interval);
            pulse(false);
        });
}
