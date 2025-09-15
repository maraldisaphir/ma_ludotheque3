
const API_URL = '/.netlify/functions/games';
const uuid = () => crypto.randomUUID();

let tsTypes;
let allTypes = [];

// --- Utilities ---
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

// --- Tom Select Init ---
function initTomSelect(selected = []) {
  const el = document.querySelector("#f-types");
  if (!el) return;
  if (tsTypes) tsTypes.destroy();
  tsTypes = new TomSelect(el, {
    options: allTypes.map(t => ({ value: t, text: t })),
    items: selected,
    create: true,
    persist: false,
    plugins: ['remove_button'],
    maxItems: null,
    placeholder: "Choisir ou saisir..."
  });
}

// --- Gestion Page Logic ---
async function initGestion() {
  const listEl = document.querySelector('#games-list');
  const addBtn = document.querySelector('#btn-add');
  const exportBtn = document.querySelector('#btn-export');
  const importInput = document.querySelector('#import-input');
  const importBtn = document.querySelector('#btn-import');
  const filterType = document.querySelector('#filter-type');
  const searchName = document.querySelector('#search-name');

  let games = [];
  const state = { editingId: null };

  function setReadOnly(modal, readonly = true) {
    modal.querySelectorAll('input, textarea').forEach(el => {
      if (el.type !== "file") el.disabled = readonly;
    });
    modal.querySelector('#btn-save').style.display = readonly ? 'none' : 'inline-flex';
    modal.querySelector('#btn-delete').style.display = readonly ? 'none' : 'inline-flex';
  }

  function applyFilters(list) {
    let selected = [];
    if (filterType) {
      selected = Array.from(filterType.selectedOptions).map(o => o.value);
    }
    const q = (searchName?.value || '').toLowerCase();

    return list.filter(g => {
      if (selected.length && !(g.type || []).some(t => selected.includes(t))) return false;
      if (q && !(g.nom || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  async function load() {
    games = await fetchGames();
    allTypes = Array.from(new Set(games.flatMap(g => g.type || []))).sort((a, b) => a.localeCompare(b));
    if (filterType) {
      filterType.innerHTML = allTypes.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    render();
  }

  function render() {
    listEl.innerHTML = '';
    if (!games.length) {
      listEl.innerHTML = '<div class="card">Aucun jeu pour le moment. Cliquez sur <b>Ajouter</b>.</div>';
      return;
    }
    let rows = applyFilters(games);
    for (const g of rows) {
      const row = document.createElement('div');
      row.className = 'card';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '64px 1fr auto';
      row.style.gap = '12px';

      const img = document.createElement('img');
      img.className = 'img-thumb';
      img.src = g.photo || '';
      img.alt = g.nom || '';

      const info = document.createElement('div');
      info.innerHTML = `<div style="font-weight:700">${g.nom}</div>
        <div class="muted" style="font-size:13px;opacity:.85">
          ${g.nbJoueurMin ?? '?'}–${g.nbJoueurMax ?? '?'} joueurs • ${g.age ?? '?'}+ • ${g.duree ?? '?'} min
        </div>
        <div>${(g.type || []).map(t => `<span class="badge">${t}</span>`).join(' ')}</div>`;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';

      const openBtn = document.createElement('button');
      openBtn.className = 'button';
      openBtn.textContent = 'Ouvrir';
      openBtn.onclick = () => openModal(g);
      actions.append(openBtn);

      row.append(img, info, actions);
      listEl.appendChild(row);
    }
  }

  function openModal(game = null) {
    state.editingId = game?.id || null;
    const modal = document.querySelector('#modal');
    modal.showModal();

    const get = id => modal.querySelector(id);
    get('#f-nom').value = game?.nom || '';
    get('#f-min').value = game?.nbJoueurMin ?? '';
    get('#f-max').value = game?.nbJoueurMax ?? '';
    get('#f-age').value = game?.age ?? '';
    get('#f-duree').value = game?.duree ?? '';

    setTimeout(() => initTomSelect(game?.type || []), 0);

    get('#f-remarque').value = game?.remarque || '';
    const lienInput = get('#f-lien');
    const lienPreview = get('#f-lien-preview');
    lienInput.value = game?.lien || '';
    if (game?.lien) {
      lienPreview.href = game.lien;
      lienPreview.style.display = 'inline';
    } else {
      lienPreview.style.display = 'none';
    }
    lienInput.oninput = () => {
      if (lienInput.value.trim()) {
        lienPreview.href = lienInput.value.trim();
        lienPreview.style.display = 'inline';
      } else {
        lienPreview.style.display = 'none';
      }
    };
    get('#f-description').value = game?.description || '';
    get('#preview').src = game?.photo || '';
    get('#f-photo').value = '';
    setReadOnly(modal, true);

    const btnEdit = modal.querySelector('#btn-edit');
    btnEdit.style.display = game ? 'inline-flex' : 'none';
    btnEdit.onclick = () => {
      const pass = prompt("Mot de passe ?");
      if (pass === "1664") {
        setReadOnly(modal, false);
      } else {
        alert("Accès refusé.");
      }
    };

    const delBtn = modal.querySelector('#btn-delete');
    delBtn.onclick = async () => {
      const pass = prompt("Mot de passe ?");
      if (pass !== "1664") {
        alert("Accès refusé.");
        return;
      }
      if (!confirm(`Supprimer "${game.nom}" ?`)) return;
      games = games.filter(x => x.id !== game.id);
      await saveGames(games);
      closeModal();
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
      type: tsTypes ? tsTypes.getValue() : [],
      remarque: get('#f-remarque').value.trim(),
      photo: photoDataUrl || '',
      lien: get('#f-lien').value.trim(),
      description: get('#f-description').value.trim()
    };

    const idx = games.findIndex(x => x.id === game.id);
    if (idx >= 0) games[idx] = game; else games.unshift(game);
    await saveGames(games);
    closeModal();
    render();
  }

  addBtn.onclick = () => {
    const pass = prompt("Mot de passe ?");
    if (pass === "1664") {
      openModal(null);
      const modal = document.querySelector('#modal');
      setReadOnly(modal, false);
    } else {
      alert("Accès refusé.");
    }
  };

  document.querySelector('#modal-form').addEventListener('submit', submitModal);
  document.querySelector('#btn-cancel').onclick = e => { e.preventDefault(); closeModal(); };
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
    alert('Import terminé.');
  };

  await load();
  if (filterType) filterType.addEventListener('change', render);
  if (searchName) searchName.addEventListener('input', render);
}

// Router
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'gestion') initGestion().catch(err => alert(err.message));
});
