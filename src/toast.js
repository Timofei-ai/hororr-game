let hideTimer = null;

export function showToast(text, durationMs = 4000) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('visible'), durationMs);
}
