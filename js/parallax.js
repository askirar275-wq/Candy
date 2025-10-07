(function () {
  const MAX_SHIFT = 18, MAX_SHIFT_X = 10;
  function setParallax(x, y) {
    document.documentElement.style.setProperty("--parallax-tx", x + "px");
    document.documentElement.style.setProperty("--parallax-ty", y + "px");
  }
  window.addEventListener("scroll", () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    setParallax((pct - 0.5) * 10, (pct - 0.5) * 18);
  });
})();
