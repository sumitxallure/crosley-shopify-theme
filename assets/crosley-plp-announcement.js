class CrosleyPlpAnnouncement extends HTMLElement {
  connectedCallback() {
    this.remainingSeconds = Number.parseInt(this.dataset.countdownSeconds || '0', 10);
    this.benefits = [...this.querySelectorAll('[data-benefit]')].map((item) => item.textContent.trim());
    this.mobileBenefit = this.querySelector('[data-mobile-benefit]');
    this.benefitIndex = 0;

    this.renderCountdown();
    this.countdownTimer = window.setInterval(() => {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
      this.renderCountdown();
    }, 1000);

    if (this.mobileBenefit && this.benefits.length > 1) {
      this.benefitTimer = window.setInterval(() => {
        this.benefitIndex = (this.benefitIndex + 1) % this.benefits.length;
        this.mobileBenefit.textContent = this.benefits[this.benefitIndex];
      }, 2600);
    }
  }

  disconnectedCallback() {
    window.clearInterval(this.countdownTimer);
    window.clearInterval(this.benefitTimer);
  }

  renderCountdown() {
    let remaining = this.remainingSeconds;
    const days = Math.floor(remaining / 86400);
    remaining -= days * 86400;
    const hours = Math.floor(remaining / 3600);
    remaining -= hours * 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining - minutes * 60;
    const values = { days, hours, minutes, seconds };

    Object.entries(values).forEach(([unit, value]) => {
      const target = this.querySelector(`[data-countdown-value="${unit}"]`);
      if (target) target.textContent = String(value).padStart(2, '0');
    });
  }
}

if (!customElements.get('crosley-plp-announcement')) {
  customElements.define('crosley-plp-announcement', CrosleyPlpAnnouncement);
}
