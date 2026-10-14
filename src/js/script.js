// Highlights the current section in the sticky index as the reader scrolls.
// Progressive enhancement only — the index works as plain anchor links without this.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.index a[href^="#"]'));
  if (!links.length) return;

  var sections = links
    .map(function (link) { return document.getElementById(link.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (!sections.length) return;

  var current = null;
  var setActive = function (index) {
    if (index === current) return;
    current = index;
    links.forEach(function (link, i) { link.classList.toggle('active', i === index); });
  };

  var update = function () {
    var doc = document.documentElement;
    var atBottom = window.innerHeight + window.pageYOffset >= doc.scrollHeight - 4;

    // At the very end of the page the last section (e.g. a short "Contact")
    // may never reach the trigger line, so it wins outright.
    if (atBottom) { setActive(sections.length - 1); return; }

    // Otherwise: the last section whose top has passed the trigger line (30% down the viewport).
    var line = window.innerHeight * 0.3;
    var active = -1;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= line) active = i;
    }
    setActive(active);
  };

  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; update(); });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
