import { Component } from '@theme/component';

/**
 * Loads and controls the Mini Cart complementary-product carousel.
 * Recommendation failures intentionally leave the section empty so core cart actions stay available.
 *
 * @extends {Component}
 */
class CartRecommendations extends Component {
  /** @type {AbortController | null} */
  #requestController = null;

  /** @type {string | null} */
  #loadedProductId = null;

  /** @type {string | null} */
  #loadingProductId = null;

  /** @type {number | null} */
  #scrollFrame = null;

  /** @type {AbortController | null} */
  #scrollController = null;

  connectedCallback() {
    super.connectedCallback();
    this.#bindTrackScroll();
    this.#load();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#bindTrackScroll();
    if (this.dataset.productId !== this.#loadedProductId) this.#load();
  }

  disconnectedCallback() {
    this.#requestController?.abort();
    this.#scrollController?.abort();
    if (this.#scrollFrame !== null) cancelAnimationFrame(this.#scrollFrame);
    super.disconnectedCallback();
  }

  async #load() {
    const productId = this.dataset.productId;
    const url = this.dataset.url;
    if (!productId || !url || productId === this.#loadedProductId || productId === this.#loadingProductId) return;

    this.#requestController?.abort();
    this.#requestController = new AbortController();
    this.#loadingProductId = productId;
    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        signal: this.#requestController.signal,
      });
      if (!response.ok) throw new Error(`Recommendation request failed with ${response.status}`);

      const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
      const replacement = documentFragment.querySelector('[data-cart-recommendations-results]');
      const liveResults = this.querySelector('[data-cart-recommendations-results]');

      if (!replacement || !liveResults || this.dataset.productId !== productId) return;

      liveResults.replaceChildren(...Array.from(replacement.childNodes).map((node) => node.cloneNode(true)));
      this.#loadedProductId = productId;
      this.#bindTrackScroll();
      this.#syncDots();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn('[cart-recommendations] Recommendations could not be loaded.', error);
    } finally {
      if (this.#loadingProductId === productId) this.#loadingProductId = null;
      if (this.dataset.productId === productId) this.removeAttribute('aria-busy');
    }
  }

  /** @param {Event} event */
  selectRecommendation(event) {
    const button = event.target;
    if (!(button instanceof HTMLElement)) return;

    const index = Number(button.dataset.recommendationDot);
    const card = this.querySelectorAll('[data-recommendation-card]')[index];
    const track = this.querySelector('[data-recommendation-track]');
    if (!(card instanceof HTMLElement) || !(track instanceof HTMLElement)) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const targetScroll = Math.min(Math.max(0, card.offsetLeft - track.offsetLeft), maxScroll);

    track.scrollTo({
      left: targetScroll,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });

    this.#setActiveDot(index);
  }

  handleScroll() {
    if (this.#scrollFrame !== null) cancelAnimationFrame(this.#scrollFrame);
    this.#scrollFrame = requestAnimationFrame(() => {
      this.#scrollFrame = null;
      this.#syncDots();
    });
  }

  #bindTrackScroll() {
    this.#scrollController?.abort();
    this.#scrollController = null;

    const track = this.querySelector('[data-recommendation-track]');
    if (!(track instanceof HTMLElement)) return;

    this.#scrollController = new AbortController();
    track.addEventListener('scroll', () => this.handleScroll(), { signal: this.#scrollController.signal });
  }

  #syncDots() {
    const track = this.querySelector('[data-recommendation-track]');
    const cards = Array.from(this.querySelectorAll('[data-recommendation-card]'));
    const dots = Array.from(this.querySelectorAll('[data-recommendation-dot]'));
    if (!(track instanceof HTMLElement) || cards.length === 0 || dots.length === 0) return;

    const trackStart = track.getBoundingClientRect().left;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll > 0 && Math.abs(track.scrollLeft - maxScroll) <= 1) {
      activeIndex = cards.length - 1;
    } else {
      cards.forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().left - trackStart);
        if (distance < closestDistance) {
          closestDistance = distance;
          activeIndex = index;
        }
      });
    }

    this.#setActiveDot(activeIndex);
  }

  /** @param {number} activeIndex */
  #setActiveDot(activeIndex) {
    const dots = Array.from(this.querySelectorAll('[data-recommendation-dot]'));
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle('is-active', isActive);
      if (isActive) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }
}

if (!customElements.get('cart-recommendations')) {
  customElements.define('cart-recommendations', CartRecommendations);
}
