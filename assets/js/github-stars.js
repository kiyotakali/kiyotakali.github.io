(function () {
  "use strict";

  function setCount(links, count, title) {
    var formatted = count.toLocaleString("en-US") + " stars";
    links.forEach(function (link) {
      var label = link.querySelector(".github-star-count");
      if (label) label.textContent = formatted;
      link.title = title;
      link.setAttribute("aria-label", link.dataset.githubRepo + " on GitHub, " + formatted);
    });
  }

  function keepFallback(links) {
    links.forEach(function (link) {
      var count = Number(link.dataset.fallbackStars);
      if (Number.isFinite(count)) {
        setCount([link], count, "Last known GitHub star count");
      }
    });
  }

  function refreshRepository(repository, links) {
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 3500);

    fetch("https://api.github.com/repos/" + repository, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal
    })
      .then(function (response) {
        window.clearTimeout(timeout);
        if (!response.ok) throw new Error("GitHub API returned " + response.status);
        return response.json();
      })
      .then(function (data) {
        if (typeof data.stargazers_count !== "number") throw new Error("Missing star count");
        setCount(links, data.stargazers_count, "Live star count from GitHub · refreshed just now");
      })
      .catch(function () {
        window.clearTimeout(timeout);
        return fetch("https://img.shields.io/github/stars/" + repository + ".json?style=flat", {
          cache: "no-store",
          headers: { Accept: "application/json" }
        })
          .then(function (response) {
            if (!response.ok) throw new Error("Badge endpoint returned " + response.status);
            return response.json();
          })
          .then(function (data) {
            var count = Number(data.value);
            if (!Number.isFinite(count)) throw new Error("Missing fallback star count");
            setCount(links, count, "Current GitHub star count · refreshed through the public badge endpoint");
          })
          .catch(function () { keepFallback(links); });
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var links = Array.from(document.querySelectorAll("[data-github-repo]"));
    var grouped = links.reduce(function (repositories, link) {
      var repository = link.dataset.githubRepo;
      if (!repository) return repositories;
      if (!repositories[repository]) repositories[repository] = [];
      repositories[repository].push(link);
      return repositories;
    }, {});

    Object.keys(grouped).forEach(function (repository) {
      refreshRepository(repository, grouped[repository]);
    });
  });
})();
