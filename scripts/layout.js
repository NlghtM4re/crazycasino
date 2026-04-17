(function () {
  var script = document.currentScript;
  var app = script.parentElement;

  var sidebarHTML =
    '<aside class="sidebar" id="sidebar">' +
      '<nav>' +
        '<ul>' +
          '<li style="padding-top: 0;">' +
            '<a><button class="toggle-sidebar" onclick="toggleSidebar()">☰</button></a>' +
          '</li>' +
          '<li><a href="index.html">🛖 <span>Home</span></a></li>' +
        '</ul>' +
        '<div class="game-section">' +
          '<h3 class="game-section-title"><span class="game-title-text">Games</span></h3>' +
          '<ul class="game-links">' +
            '<li><a href="slot.html">🍉 <span>Slot</span></a></li>' +
            '<li><a href="mines.html">💣 <span>Mines</span></a></li>' +
            '<li><a href="crash.html">🚀 <span>Crash</span></a></li>' +
            '<li><a href="blackjack.html">🃏 <span>Blackjack</span></a></li>' +
            '<li><a href="plinko.html">🔺 <span>Plinko</span></a></li>' +
            '<li><a href="stockmarket.html">〽️ <span>Stock Market</span></a></li>' +
          '</ul>' +
        '</div>' +
        '<ul>' +
          '<li><a href="bank.html">💳 <span>Bank</span></a></li>' +
          '<li><a href="help.html">❓ <span>Help</span></a></li>' +
          '<li><a href="update.html">❕ <span>Update</span></a></li>' +
        '</ul>' +
      '</nav>' +
    '</aside>';

  var topbarHTML =
    '<header class="top-bar">' +
      '<div class="logo"><a href="index.html" style="color: white; text-decoration: none;">Crazy Casino</a></div>' +
      '<div class="money-display">' +
        '<div class="credit-display">Credits: <span id="credits"></span></div>' +
        '<div class="dept-display">Debt: <span id="debt">0</span></div>' +
      '</div>' +
    '</header>';

  var footerHTML =
    '<footer class="site-footer">' +
      '<div class="footer-links">' +
        '<a href="privacy-policy.html">Privacy Policy</a>' +
        '<a href="terms-of-service.html">Terms of Service</a>' +
        '<a href="about.html">About Us</a>' +
        '<a href="help.html">Help</a>' +
      '</div>' +
      '<p>&copy; 2026 Crazy Casino. All rights reserved.</p>' +
    '</footer>';

  // Inject sidebar and topbar before this script tag (so they appear first in .app)
  script.insertAdjacentHTML('beforebegin', sidebarHTML + topbarHTML);

  // Inject footer as last child of .app after the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('.app').insertAdjacentHTML('beforeend', footerHTML);
  });
})();
