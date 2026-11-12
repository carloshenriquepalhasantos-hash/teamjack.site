const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
const progressLinks = Array.from(document.querySelectorAll('[data-progress-link]'));
const chapterNumber = document.getElementById('chapter-number');
const chapterCaption = document.getElementById('chapter-caption');
const scene = document.getElementById('scene');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const menuToggle = document.getElementById('menu-toggle');
const primaryNav = document.getElementById('primary-nav');

const closeMenu = () => {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menu');
  primaryNav.classList.remove('is-open');
};

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
  primaryNav.classList.toggle('is-open', !isOpen);
});

primaryNav.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

let activeChapter = 0;

const setActiveChapter = (index) => {
  if (index < 0 || index >= chapters.length || index === activeChapter) return;
  activeChapter = index;
  const chapter = chapters[index];
  const number = chapter.dataset.chapter;
  const caption = chapter.dataset.caption;

  chapterNumber.textContent = number;
  chapterCaption.textContent = caption;
  chapterCaption.parentElement.setAttribute('aria-label', `Capítulo ${number}: ${caption}`);

  progressLinks.forEach((link, linkIndex) => {
    const active = linkIndex === index;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
};

const chapterObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (!visible) return;
  setActiveChapter(chapters.indexOf(visible.target));
}, { threshold: [0.2, 0.45, 0.7], rootMargin: '-8% 0px -8% 0px' });

chapters.forEach((chapter) => chapterObserver.observe(chapter));

progressLinks.forEach((link, index) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    chapters[index].scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
});

document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

  const target = event.target;
  if (target instanceof HTMLElement && target.closest('a, button, summary, input, textarea, select, [contenteditable="true"]')) return;

  event.preventDefault();
  const nextIndex = activeChapter + (event.key === 'ArrowDown' ? 1 : -1);
  if (chapters[nextIndex]) {
    chapters[nextIndex].scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
});

let cameraFrame = 0;
const updateCamera = () => {
  cameraFrame = 0;
  if (reducedMotion.matches) return;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  scene.style.setProperty('--camera-x', `${(progress - .5) * -5}vw`);
  scene.style.setProperty('--camera-y', `${(progress - .5) * 2.5}vh`);
  scene.style.setProperty('--camera-zoom', `${1.02 + progress * .1}`);
  scene.style.setProperty('--camera-tilt', `${(progress - .5) * 1.2}deg`);
};

window.addEventListener('scroll', () => {
  if (!cameraFrame) cameraFrame = window.requestAnimationFrame(updateCamera);
}, { passive: true });

window.addEventListener('resize', () => {
  if (!cameraFrame) cameraFrame = window.requestAnimationFrame(updateCamera);
}, { passive: true });

if (!reducedMotion.matches && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - .5) * -14;
    const y = (event.clientY / window.innerHeight - .5) * -10;
    scene.style.setProperty('--pointer-x', `${x}px`);
    scene.style.setProperty('--pointer-y', `${y}px`);
  }, { passive: true });
}

const canvas = document.getElementById('atmosphere');
const context = canvas.getContext('2d', { alpha: true });
const points = [];
const pointCount = 46;
let canvasFrame = 0;
let canvasWidth = 0;
let canvasHeight = 0;

const resizeCanvas = () => {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.round(canvasWidth * pixelRatio);
  canvas.height = Math.round(canvasHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (!points.length) {
    for (let index = 0; index < pointCount; index += 1) {
      points.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * 1.4 + .4,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
};

const drawAtmosphere = (time = 0) => {
  canvasFrame = 0;
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  points.forEach((point, index) => {
    const drift = reducedMotion.matches ? 0 : Math.sin(time * .00025 + point.phase) * 5;
    const x = point.x * canvasWidth + drift;
    const y = point.y * canvasHeight;
    const alpha = .12 + (Math.sin(time * .0005 + point.phase) + 1) * .1;

    context.beginPath();
    context.arc(x, y, point.radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(225, 203, 242, ${alpha})`;
    context.fill();

    for (let otherIndex = index + 1; otherIndex < points.length; otherIndex += 1) {
      const other = points[otherIndex];
      const otherX = other.x * canvasWidth;
      const otherY = other.y * canvasHeight;
      const distance = Math.hypot(x - otherX, y - otherY);
      if (distance > 120) continue;

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(otherX, otherY);
      context.strokeStyle = `rgba(208, 184, 228, ${(1 - distance / 120) * .08})`;
      context.lineWidth = 1;
      context.stroke();
    }
  });

  if (!reducedMotion.matches && document.visibilityState === 'visible') {
    canvasFrame = window.requestAnimationFrame(drawAtmosphere);
  }
};

resizeCanvas();
drawAtmosphere();

window.addEventListener('resize', () => {
  resizeCanvas();
  if (!canvasFrame && !reducedMotion.matches) {
    canvasFrame = window.requestAnimationFrame(drawAtmosphere);
  } else if (reducedMotion.matches) {
    drawAtmosphere();
  }
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && canvasFrame) {
    window.cancelAnimationFrame(canvasFrame);
    canvasFrame = 0;
  } else if (document.visibilityState === 'visible' && !canvasFrame && !reducedMotion.matches) {
    canvasFrame = window.requestAnimationFrame(drawAtmosphere);
  }
});

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && canvasFrame) {
    window.cancelAnimationFrame(canvasFrame);
    canvasFrame = 0;
  } else if (!reducedMotion.matches && !canvasFrame) {
    canvasFrame = window.requestAnimationFrame(drawAtmosphere);
  }
  drawAtmosphere();
});

document.getElementById('current-year').textContent = String(new Date().getFullYear());
