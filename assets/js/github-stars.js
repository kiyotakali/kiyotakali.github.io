(function () {
  "use strict";

  var REFRESH_MS = 30 * 60 * 1000;
  var CHECK_MS = 60 * 1000;
  var CACHE_PREFIX = "kiyotakali:github-stars:";
  var inFlight = {};

  function getTrackers() {
    return document.querySelectorAll("[data-github-repo]");
  }

  function formatCount(count) {
    var raw;
    if (typeof count === "number") {
      if (!Number.isFinite(count) || count < 0 || Math.floor(count) !== count) return null;
      raw = String(count);
    } else if (typeof count === "string") {
      raw = count.trim();
    } else {
      return null;
    }

    if (/^\d+$/.test(raw)) return Number(raw).toLocaleString("en-US");
    if (/^\d+(?:\.\d+)?[kKmMbBtT]$/.test(raw)) return raw;
    return null;
  }

  function renderCount(repository, count) {
    var formatted = formatCount(count);
    if (!formatted) return;

    getTrackers().forEach(function (tracker) {
      if (tracker.getAttribute("data-github-repo") !== repository) return;
      var display = tracker.querySelector("[data-github-star-display]");
      var countNode = tracker.querySelector("[data-github-star-count]");
      if (!display || !countNode) return;

      countNode.textContent = formatted;
      display.setAttribute("aria-label", formatted + " GitHub stars");
      display.hidden = false;
    });
  }

  function readCache(repository) {
    try {
      var cached = JSON.parse(window.localStorage.getItem(CACHE_PREFIX + repository));
      if (!cached || !formatCount(cached.count) || typeof cached.updatedAt !== "number") return null;
      return cached;
    } catch (error) {
      return null;
    }
  }

  function writeCache(repository, count) {
    try {
      window.localStorage.setItem(CACHE_PREFIX + repository, JSON.stringify({
        count: count,
        updatedAt: Date.now()
      }));
    } catch (error) {
      // Counts still work without storage; they simply refresh every page load.
    }
  }

  function fetchCount(repository) {
    if (inFlight[repository]) return inFlight[repository];
    if (typeof window.fetch !== "function") return null;

    var encodedRepository = repository.split("/").map(encodeURIComponent).join("/");
    var request = window.fetch("https://img.shields.io/github/stars/" + encodedRepository + ".json", {
      credentials: "omit",
      cache: "no-store"
    }).then(function (response) {
      if (!response.ok) throw new Error("Star service returned " + response.status);
      return response.json();
    }).then(function (data) {
      var formatted = formatCount(data && data.value);
      if (!formatted) throw new Error("Star service returned an invalid count");
      renderCount(repository, formatted);
      writeCache(repository, formatted);
      return formatted;
    });

    inFlight[repository] = request.then(function (count) {
      delete inFlight[repository];
      return count;
    }, function () {
      delete inFlight[repository];
      return null;
    });

    return inFlight[repository];
  }

  function refreshCounts() {
    if (document.hidden) return;

    var now = Date.now();
    var repositoriesToFetch = {};
    getTrackers().forEach(function (tracker) {
      var repository = tracker.getAttribute("data-github-repo");
      if (!repository) return;

      var cached = readCache(repository);
      if (cached) renderCount(repository, cached.count);
      if (!cached || now - cached.updatedAt >= REFRESH_MS) repositoriesToFetch[repository] = true;
    });

    Object.keys(repositoriesToFetch).forEach(fetchCount);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!getTrackers().length) return;
    refreshCounts();
    window.setInterval(refreshCounts, CHECK_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshCounts();
    });
  });
})();

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var videos = Array.prototype.slice.call(document.querySelectorAll("video[data-lazy-video]"));
    if (!videos.length) return;

    var motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var effectiveType = connection && connection.effectiveType;
    var limitedNetwork = connection && (connection.saveData || effectiveType === "slow-2g" || effectiveType === "2g");
    if ((motionQuery && motionQuery.matches) || limitedNetwork || !("IntersectionObserver" in window)) return;

    function setPlaybackRate(video) {
      var rate = parseFloat(video.getAttribute("data-playback-rate"));
      if (!Number.isFinite(rate) || rate <= 0 || rate > 4) rate = 1;
      video.defaultPlaybackRate = rate;
      video.playbackRate = rate;
    }

    function loadVideo(video) {
      if (video.getAttribute("data-video-loaded") === "true" || video.getAttribute("data-video-failed") === "true") return;
      var source = video.getAttribute("data-src");
      if (!source) return;

      video.muted = true;
      video.src = source;
      video.setAttribute("data-video-loaded", "true");
      setPlaybackRate(video);
      video.load();
    }

    function playVideo(video) {
      if (document.hidden || video.getAttribute("data-video-failed") === "true") return;
      loadVideo(video);
      setPlaybackRate(video);
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
    }

    videos.forEach(function (video) {
      video.addEventListener("loadedmetadata", function () { setPlaybackRate(video); });
      video.addEventListener("play", function () { setPlaybackRate(video); });
      video.addEventListener("error", function () {
        video.pause();
        video.setAttribute("data-video-failed", "true");
        video.removeAttribute("src");
        video.load();
      });
    });

    var loadObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadVideo(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "320px 0px" });

    var playObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        var isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
        video.setAttribute("data-video-visible", isVisible ? "true" : "false");
        if (isVisible) playVideo(video);
        else video.pause();
      });
    }, { threshold: [0, 0.4, 1] });

    videos.forEach(function (video) {
      loadObserver.observe(video);
      playObserver.observe(video);
    });

    document.addEventListener("visibilitychange", function () {
      videos.forEach(function (video) {
        if (document.hidden) video.pause();
        else if (video.getAttribute("data-video-visible") === "true") playVideo(video);
      });
    });
  });
})();
