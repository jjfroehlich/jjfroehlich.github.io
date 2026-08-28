const coverSwaps = document.querySelectorAll('.cover-swap');
const usesTouchOnly = window.matchMedia('(hover: none)').matches;

coverSwaps.forEach((coverSwap) => {
  coverSwap.addEventListener('click', () => {
    if (!usesTouchOnly) return;

    const isAlternate = coverSwap.classList.toggle('is-alternate');
    const workTitle = coverSwap.dataset.workTitle || 'illustration';
    coverSwap.setAttribute('aria-pressed', String(isAlternate));
    coverSwap.setAttribute(
      'aria-label',
      `${isAlternate ? 'Show original' : 'Show alternate'} ${workTitle}`,
    );
  });
});
