const API_URL = '/.netlify/functions/games';

// --- Utilities ---
const uuid = () => crypto.randomUUID();

async function fetchGames() {
  const res = await fetch(API_URL, { method: 'GET' });
  if (!res.ok) throw new Error('GET failed');
  return await res.json();
}

async function saveGames(games) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(games),
  });
  if (!res.ok) throw new Error('POST failed');
  return await res.json();
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Gestion Page Logic ---
async function initGestion() {
  const listEl = document.querySelector('#games-list');
  const addBtn = document.querySelector('#btn-add');
  const exportBtn = document.querySelector('#btn-export');
  const importInput = document.querySelector('#import-input');
  const importBtn = document.querySelector('#btn-import');

  let games = [];
  const state = { editingId: null };


  const fltSearch = document.querySelector('#flt-search');
  const fltAge = document.querySelector('#flt-age');
  const fltMin = document.querySelector('#flt-min');
  const fltMax = document.querySelector('#flt-max');
  const fltDuree = document.querySelector('#flt-duree');
  const overlay = document.getElementById('overlay');
  const drawer = document.getElementById('filter-drawer');
  const btnFilters = document.getElementById('btn-filters');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const countBadge = document.getElementById('filter-count');

  function openDrawer(){ if(drawer&&overlay){drawer.classList.add('open'); overlay.style.display='block';} }
  function closeDrawer(){ if(drawer&&overlay){drawer.classList.remove('open'); overlay.style.display='none';} }
  if(btnFilters) btnFilters.onclick = openDrawer;
  if(btnCloseDrawer) btnCloseDrawer.onclick = closeDrawer;
  if(overlay) overlay.onclick = closeDrawer;

  function applyFilters(list) {
  const filterType = document.querySelector('#filter-type');
  let selected = [];
  if(filterType){
    selected = Array.from(filterType.selectedOptions).map(o => o.value);
  }
  return list.filter(g => {
    if(selected.length && !(g.type||[]).some(t => selected.includes(t))) return false;
    return true;
  });
}

  // Supprimer (protégé aussi)
  const delBtn = modal.querySelector('#btn-delete');
  delBtn.onclick = async () => {
    const pass = prompt("Mot de passe ?");
    if(pass !== "1664") {
      alert("Accès refusé.");
      return;
    }
    if (!confirm(`Supprimer "${game.nom}" ?`)) return;
    games = games.filter(x => x.id !== game.id);
    await saveGames(games);
    closeModal();
    if(document.querySelector('#filter-type')){
      const types = Array.from(new Set(games.flatMap(g => g.type||[]))).sort((a,b)=>a.localeCompare(b));
      document.querySelector('#filter-type').innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    render();
  };
}
function closeModal() {
    document.querySelector('#modal').close();
  }

  async function submitModal(e) {
    e.preventDefault();
    const modal = document.querySelector('#modal');
    const get = id => modal.querySelector(id);

    let photoDataUrl = get('#preview').src || '';
    const file = get('#f-photo').files?.[0];
    if (file) {
      photoDataUrl = await fileToDataURL(file);
    }

    const game = {
      id: state.editingId || uuid(),
      nom: get('#f-nom').value.trim(),
      nbJoueurMin: parseInt(get('#f-min').value || '0', 10) || null,
      nbJoueurMax: parseInt(get('#f-max').value || '0', 10) || null,
      age: parseInt(get('#f-age').value || '0', 10) || null,
      duree: parseInt(get('#f-duree').value || '0', 10) || null,
      type: get('#f-types').value.split(',').map(s => s.trim()).filter(Boolean),
      remarque: get('#f-remarque').value.trim(),
      photo: photoDataUrl || '',
      lien: get('#f-lien').value.trim(),
      description: get('#f-description').value.trim()
    };

    // Upsert
    const idx = games.findIndex(x => x.id === game.id);
    if (idx >= 0) games[idx] = game; else games.unshift(game);

    await saveGames(games);
    closeModal();
    if(document.querySelector('#filter-type')){
      const types = Array.from(new Set(games.flatMap(g => g.type||[]))).sort((a,b)=>a.localeCompare(b));
      document.querySelector('#filter-type').innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    render();
  }

  // wire up
  addBtn.onclick = () => {
    const pass = prompt("Mot de passe ?");
    if(pass === "1664") {
      openModal(null);
      const modal = document.querySelector('#modal');
      setReadOnly(modal,false);
    } else {
      alert("Accès refusé.");
    }
  };
  document.querySelector('#modal-form').addEventListener('submit', submitModal);
  document.querySelector('#btn-cancel').onclick = e => { e.preventDefault(); document.querySelector('#modal').close(); };
  document.querySelector('#f-photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      document.querySelector('#preview').src = await fileToDataURL(file);
    }
  });

  exportBtn.onclick = () => download('ludotheque.json', JSON.stringify(games, null, 2));

  importBtn.onclick = () => importInput.click();
  importInput.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch { alert('JSON invalide'); return; }
    if (!Array.isArray(data)) { alert('Le fichier doit contenir un tableau de jeux'); return; }
    await saveGames(data);
    await load();
  const sortSelect = document.querySelector('#sort-select');
  if(sortSelect){ sortSelect.addEventListener('change', render); }
  const filterType = document.querySelector('#filter-type');
  if(filterType){ filterType.addEventListener('change', render); }

  ;[fltSearch, fltAge, fltMin, fltMax, fltDuree].forEach(el=>{ if(el) el.addEventListener('input', render); });
    alert('Import terminé.');
  };

  await load();
  ;[fltSearch, fltAge, fltMin, fltMax, fltDuree].forEach(el=>{ if(el) el.addEventListener('input', render); });
}

// --- Consultation Page Logic ---
async function initConsultation() {
  const tableBody = document.querySelector('#tbody');
  const search = document.querySelector('#search');
  const filtType = document.querySelector('#f-type');
  const filtAge = document.querySelector('#f-age');
  const filtMin = document.querySelector('#f-min');
  const filtMax = document.querySelector('#f-max');

  let games = await fetchGames();

  function render() {
    const q = (search.value || '').toLowerCase();
    const fType = filtType.value || '';
    const fAge = parseInt(filtAge.value || '0', 10) || 0;
    const minP = parseInt(filtMin.value || '0', 10) || 0;
    const maxP = parseInt(filtMax.value || '0', 10) || 0;

    const rows = games.filter(g => {
      const matchesQ = !q || [g.nom, g.description, g.remarque, (g.type||[]).join(' ')].join(' ').toLowerCase().includes(q);
      const matchesType = !fType || (g.type||[]).some(t => t.toLowerCase() === fType.toLowerCase());
      const matchesAge = !fAge || (g.age || 0) >= fAge;
      const matchesMin = !minP || (g.nbJoueurMin || 0) <= minP && (g.nbJoueurMax || 0) >= minP;
      const matchesMax = !maxP || (g.nbJoueurMin || 0) <= maxP && (g.nbJoueurMax || 0) >= maxP;
      return matchesQ && matchesType && matchesAge && matchesMin && matchesMax;
    });

    tableBody.innerHTML = rows.map(g => `
      <tr>
        <td><img class="img-thumb" src="${g.photo || ''}" alt="${g.nom || ''}"></td>
        <td><div style="font-weight:700">${g.nom}</div>
            <div style="font-size:12px; opacity:.85">${g.description ? g.description : ''}</div>
            ${g.lien ? `<div style="margin-top:6px"><a href="${g.lien}" target="_blank" rel="noopener">Lien</a></div>` : ''}
        </td>
        <td>${g.nbJoueurMin ?? '?'}–${g.nbJoueurMax ?? '?'}</td>
        <td>${g.age ?? '?'}</td>
        <td>${g.duree ?? '?'}</td>
        <td>${(g.type||[]).map(t=>`<span class="badge">${t}</span>`).join(' ')}</td>
      </tr>
    `).join('');
  }

  // Populate type filter with unique values
  const types = Array.from(new Set(games.flatMap(g => g.type || []))).sort((a,b)=>a.localeCompare(b));
  filtType.innerHTML = '<option value="">Tous types</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');

  [search, filtType, filtAge, filtMin, filtMax].forEach(el => el.addEventListener('input', render));
  if(document.querySelector('#filter-type')){
      const types = Array.from(new Set(games.flatMap(g => g.type||[]))).sort((a,b)=>a.localeCompare(b));
      document.querySelector('#filter-type').innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    render();
}

// Router
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'gestion') initGestion().catch(err => alert(err.message));
  if (page === 'consultation') initConsultation().catch(err => alert(err.message));
});