(function () {
  "use strict";

  var ICON_MARKUP =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-3px;margin-right:6px;flex-shrink:0">' +
    '<path d="M15 2.5H12C7.52166 2.5 5.28249 2.5 3.89124 3.89124C2.5 5.28249 2.5 7.52166 2.5 12C2.5 16.4783 2.5 18.7175 3.89124 20.1088C5.28249 21.5 7.52166 21.5 12 21.5C16.4783 21.5 18.7175 21.5 20.1088 20.1088C21.5 18.7175 21.5 16.4783 21.5 12V10" stroke="#22C55E" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M8.5 10L12 13.5L21.0002 3.5" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  function createIcon() {
    var span = document.createElement("span");
    span.innerHTML = ICON_MARKUP;
    return span.firstChild;
  }

  function fix() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var matches = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim() === "✅") matches.push(node);
    }
    matches.forEach(function (textNode) {
      textNode.parentNode.replaceChild(createIcon(), textNode);
    });
  }

  fix();
  document.addEventListener("DOMContentLoaded", fix);
  window.addEventListener("load", fix);

  // The Sapper bundle re-renders this section on hydration and on each
  // data poll, reinstating the emoji text node — watch for that and
  // swap it back to the SVG. This script runs from a <script> tag in
  // <nav>, before <main> exists, so observe document.body (already
  // present when the tag executes) rather than a more specific
  // container that isn't in the DOM yet.
  if (window.MutationObserver) {
    new MutationObserver(fix).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
})();
