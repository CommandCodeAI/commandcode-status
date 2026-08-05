(function () {
  "use strict";

  var LABEL = "Status";

  function fix() {
    var el = document.querySelector(".logo div");
    if (el && el.textContent !== LABEL) el.textContent = LABEL;
  }

  fix();
  document.addEventListener("DOMContentLoaded", fix);
  window.addEventListener("load", fix);

  // The Sapper bundle re-renders the nav on hydration, overwriting
  // the static label — watch for that and correct it back.
  var target = document.querySelector(".logo");
  if (target && window.MutationObserver) {
    new MutationObserver(fix).observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
})();
