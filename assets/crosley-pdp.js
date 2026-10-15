import { StandardEvents } from '@shopify/events';
import { ThemeEvents } from '@theme/events';

function syncSlideshowAccessibility(root = document) {
  root.querySelectorAll('.product-information--crosley-pdp slideshow-slides').forEach((slides) => {
    const productTitle = slides.closest('.product-information--crosley-pdp')?.querySelector('h1');

    slides.tabIndex = 0;
    if (productTitle) {
      productTitle.id ||= 'crosley-pdp-title';
      slides.setAttribute('aria-labelledby', productTitle.id);
    }
  });

  root.querySelectorAll('.product-information--crosley-pdp .slideshow-controls__dots').forEach((list) => {
    list.setAttribute('role', 'tablist');
    list.querySelectorAll(':scope > li').forEach((item) => item.setAttribute('role', 'presentation'));
    list.querySelectorAll('button[aria-selected]').forEach((button) => {
      button.setAttribute('role', 'tab');
      button.tabIndex = button.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
  });

  root.querySelectorAll('.product-recommendations--crosley-pdp slideshow-slide[aria-hidden]').forEach((slide) => {
    slide.toggleAttribute('inert', slide.getAttribute('aria-hidden') === 'true');
  });
}

function syncCrosleyVariantLabels(root = document) {
  root.querySelectorAll('.product-information--crosley-pdp variant-picker fieldset').forEach((fieldset) => {
    const legend = fieldset.querySelector('legend');
    const checked = fieldset.querySelector('input:checked');
    if (!legend || !checked) return;
    legend.dataset.label ||= legend.textContent.trim();
    const displayValue = checked.value === 'Black' ? 'Dark Emerald' : checked.value === 'Cream' ? 'Lavender' : checked.value;
    const nextLabel = `${legend.dataset.label}: ${displayValue}`;
    if (legend.textContent !== nextLabel) legend.textContent = nextLabel;
  });
}

function initializeSecondaryOptions(root = document) {
  root.querySelectorAll('[data-crosley-secondary-option]:not([data-initialized])').forEach((fieldset) => {
    fieldset.dataset.initialized = 'true';
    fieldset.addEventListener('change', (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      const label = fieldset.querySelector('[data-crosley-secondary-label]');
      if (label) label.textContent = event.target.value;
    });
  });
}

function syncQuantityNotice(root = document) {
  root.querySelectorAll('[data-crosley-quantity-notice]').forEach((notice) => {
    const selector = notice.closest('.quantity-selector-wrapper')?.querySelector('quantity-selector-component');
    const quantity = Number(selector?.getValue?.() ?? selector?.querySelector('input')?.value ?? 0);
    notice.hidden = quantity < 10;
  });
}

if (!window.crosleyPdpInitialized) {
  window.crosleyPdpInitialized = true;

  syncSlideshowAccessibility();
  syncCrosleyVariantLabels();
  initializeSecondaryOptions();
  syncQuantityNotice();

  document.addEventListener(ThemeEvents.quantitySelectorUpdate, (event) => {
    if (event.detail.cartLine) return;
    syncQuantityNotice();
  });

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === 'childList' || mutation.attributeName === 'aria-hidden' || mutation.attributeName === 'aria-selected')) {
      syncSlideshowAccessibility();
      syncCrosleyVariantLabels();
      initializeSecondaryOptions();
      syncQuantityNotice();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden', 'aria-selected'],
  });

  document.addEventListener(StandardEvents.cartLinesUpdate, async (event) => {
    if (event.action !== 'add' || !document.querySelector('.product-information--crosley-pdp')) return;

    try {
      const result = await event.promise;
      if (result?.detail?.didError) return;
      requestAnimationFrame(() => document.querySelector('#cart-drawer')?.open());
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('[crosley-pdp] Cart drawer could not be opened.', error);
    }
  });
}
