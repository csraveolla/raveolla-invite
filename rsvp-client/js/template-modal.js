// ============================================================
// template-modal.js — Modal Pilih Template Pesan (iframe)
// ============================================================

let targetFieldId = null;

export function bukaModalTemplate(fieldId) {
  targetFieldId = fieldId;
  const modal  = document.getElementById('modal-template-pesan');
  const iframe = document.getElementById('iframe-template-pesan');
  iframe.src = 'template-pesan.html'; // sesuaikan path halaman katalog template kamu
  modal.classList.add('show');
}

export function tutupModalTemplate() {
  document.getElementById('modal-template-pesan').classList.remove('show');
  document.getElementById('iframe-template-pesan').src = 'about:blank';
  targetFieldId = null;
}

// Dipanggil oleh iframe via postMessage: { type: 'template-selected', text: '...' }
window.addEventListener('message', (e) => {
  if (e.data?.type === 'template-selected' && targetFieldId) {
    const field = document.getElementById(targetFieldId);
    if (field) field.value = e.data.text;
    tutupModalTemplate();
  }
});
