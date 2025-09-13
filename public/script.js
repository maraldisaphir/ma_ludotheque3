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

  function applyFilters(list) {
    const q = (fltSearch.value||'').toLowerCase();
    const age = parseInt(fltAge.value||'0',10) || 0;
    const minP = parseInt(fltMin.value||'0',10) || 0;
    const maxP = parseInt(fltMax.value||'0',10) || 0;
    const duree = parseInt(fltDuree.value||'0',10) || 0;

    return list.filter(g=>{
      const matchesQ = !q || (g.nom+" "+g.description+" "+g.remarque).toLowerCase().includes(q);
      const matchesAge = !age || (g.age||0) >= age;
      const matchesMin = !minP || ((g.nbJoueurMin||0) <= minP && (g.nbJoueurMax||0) >= minP);
      const matchesMax = !maxP || ((g.nbJoueurMin||0) <= maxP && (g.nbJoueurMax||0) >= maxP);
      const matchesDur = !duree || (g.duree||9999) <= duree;
      return matchesQ && matchesAge && matchesMin && matchesMax && matchesDur;
    });
  }

  const overlay = document.getElementById('overlay');
  const drawer = document.getElementById('filter-drawer');
  const btnFilters = document.getElementById('btn-filters');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');

  function openDrawer(){ drawer.classList.add('open'); overlay.style.display='block'; }
  function closeDrawer(){ drawer.classList.remove('open'); overlay.style.display='none'; }

  if(btnFilters){ btnFilters.onclick = openDrawer; }
  if(btnCloseDrawer){ btnCloseDrawer.onclick = closeDrawer; }
  if(overlay){ overlay.onclick = closeDrawer; }

  [fltSearch, fltAge, fltMin, fltMax, fltDuree].forEach(el=>el.addEventListener('input', render));

  async function load() {
    games = await fetchGames();
    render();
  }

  function render() {
    listEl.innerHTML = '';
    if (!games.length) {
      listEl.innerHTML = '<div class="card">Aucun jeu pour le moment. Cliquez sur <b>Ajouter</b>.</div>';
      return;
    }
    for (const g of applyFilters(games)) {
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
        <div>${(g.type||[]).map(t=>`<span class="badge">${t}</span>`).join(' ')}</div>`;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';

      const edit = document.createElement('button');
      edit.className = 'button';
      edit.textContent = 'Modifier';
      edit.onclick = () => openModal(g);

      actions.append(edit);
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
    get('#f-types').value = (game?.type||[]).join(', ');
    get('#f-remarque').value = game?.remarque || '';
    get('#f-lien').value = game?.lien || '';
    get('#f-description').value = game?.description || '';
    get('#preview').src = game?.photo || '';
    get('#f-photo').value = '';
    const delBtn = modal.querySelector('#btn-delete');
    if (game) {
      delBtn.style.display = 'inline-flex';
      delBtn.onclick = async () => {
        if (!confirm(`Supprimer "${game.nom}" ?`)) return;
        games = games.filter(x => x.id !== game.id);
        await saveGames(games);
        closeModal();
        render();
      };
    } else {
      delBtn.style.display = 'none';
      delBtn.onclick = null;
    }

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
    render();
  }

  // wire up
  addBtn.onclick = () => openModal(null);
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
    alert('Import terminé.');
  };

  await load();
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
  render();
}

// Router
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'gestion') initGestion().catch(err => alert(err.message));
  if (page === 'consultation') initConsultation().catch(err => alert(err.message));
});