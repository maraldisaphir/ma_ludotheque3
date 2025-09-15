const API_URL = '/.netlify/functions/games';
let tsTypes;

// --- Utils ---
const uuid = () => crypto.randomUUID();
async function fetchGames() {
  const res = await fetch(API_URL);
  return res.ok ? res.json() : [];
}
async function saveGames(games) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(games)
  });
  return res.json();
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function download(filename, text) {
  const a = document.createElement('a');
  const blob = new Blob([text], { type:'application/json' });
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// --- TomSelect init ---
function initTomSelect(knownTypes, selected=[]) {
  const el = document.querySelector("#f-types");
  if (!el) return;
  if (tsTypes) tsTypes.destroy();
  tsTypes = new TomSelect(el, {
    options: knownTypes.map(t => ({ value: t, text: t })),
    items: selected,
    create: true,
    plugins: ['remove_button'],
    maxItems: null,
  });
}

// --- Gestion ---
async function initGestion() {
  const listEl = document.querySelector('#games-list');
  const addBtn = document.querySelector('#btn-add');
  const exportBtn = document.querySelector('#btn-export');
  const importBtn = document.querySelector('#btn-import');
  const importInput = document.querySelector('#import-input');

  let games = [];
  const state = { editingId: null };

  function setReadOnly(modal, ro=true) {
    modal.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type !== "file") el.disabled = ro;
    });
    if (tsTypes) {
      if (ro) tsTypes.disable(); else tsTypes.enable();
    }
    modal.querySelector('#btn-save').style.display = ro ? 'none':'inline-flex';
    modal.querySelector('#btn-delete').style.display = ro ? 'none':'inline-flex';
  }

  async function load() {
    games = await fetchGames();
    render();
  }

  function render() {
    listEl.innerHTML = '';
    if (!games.length) {
      listEl.innerHTML = '<div class="card">Aucun jeu. Cliquez sur Ajouter.</div>';
      return;
    }
    for (const g of games) {
      const row = document.createElement('div');
      row.className = 'card';
      row.innerHTML = \`
        <img class="img-thumb" src="\${g.photo||''}" alt="" />
        <div style="flex:1">
          <div><b>\${g.nom}</b></div>
          <div>\${g.nbJoueurMin||'?'}–\${g.nbJoueurMax||'?'} joueurs • \${g.age||'?'}+ • \${g.duree||'?'} min</div>
          <div>\${(g.type||[]).map(t=>'<span>'+t+'</span>').join(', ')}</div>
        </div>
        <button class="button">Ouvrir</button>
      \`;
      row.querySelector('button').onclick = () => openModal(g);
      listEl.appendChild(row);
    }
  }

  function openModal(game=null) {
    state.editingId = game?.id || null;
    const modal = document.querySelector('#modal');
    modal.showModal();
    const get=id=>modal.querySelector(id);
    get('#f-nom').value = game?.nom||'';
    get('#f-min').value = game?.nbJoueurMin||'';
    get('#f-max').value = game?.nbJoueurMax||'';
    get('#f-age').value = game?.age||'';
    get('#f-duree').value = game?.duree||'';
    const types = Array.from(new Set(games.flatMap(g=>g.type||[]))).sort();
    setTimeout(()=>initTomSelect(types, game?.type||[]),0);
    get('#f-remarque').value = game?.remarque||'';
    get('#f-lien').value = game?.lien||'';
    get('#f-description').value = game?.description||'';
    get('#preview').src = game?.photo||'';
    get('#f-photo').value = '';
    setReadOnly(modal,true);

    modal.querySelector('#btn-edit').onclick=()=>{
      const pass=prompt("Mot de passe ?");
      if(pass==="1664") setReadOnly(modal,false);
    };
    modal.querySelector('#btn-delete').onclick=async()=>{
      if(confirm("Supprimer ?")) {
        games = games.filter(x=>x.id!==game.id);
        await saveGames(games); modal.close(); render();
      }
    };
  }

  async function submitModal(e) {
    e.preventDefault();
    const modal = document.querySelector('#modal');
    const get=id=>modal.querySelector(id);
    let photo = get('#preview').src||'';
    if(get('#f-photo').files[0]) photo = await fileToDataURL(get('#f-photo').files[0]);
    const game={
      id: state.editingId||uuid(),
      nom:get('#f-nom').value,
      nbJoueurMin:parseInt(get('#f-min').value)||null,
      nbJoueurMax:parseInt(get('#f-max').value)||null,
      age:parseInt(get('#f-age').value)||null,
      duree:parseInt(get('#f-duree').value)||null,
      type:tsTypes?tsTypes.getValue():[],
      remarque:get('#f-remarque').value,
      lien:get('#f-lien').value,
      description:get('#f-description').value,
      photo
    };
    const idx=games.findIndex(x=>x.id===game.id);
    if(idx>=0) games[idx]=game; else games.unshift(game);
    await saveGames(games); modal.close(); render();
  }

  addBtn.onclick=()=>{
    const pass=prompt("Mot de passe ?");
    if(pass==="1664") {
      openModal(null);
      const modal=document.querySelector('#modal');
      setReadOnly(modal,false);
    }
  };

  document.querySelector('#modal-form').addEventListener('submit',submitModal);
  document.querySelector('#btn-cancel').onclick=e=>{e.preventDefault();document.querySelector('#modal').close();};

  exportBtn.onclick=()=>download('ludotheque.json',JSON.stringify(games,null,2));
  importBtn.onclick=()=>importInput.click();
  importInput.onchange=async e=>{
    const file=e.target.files[0]; if(!file)return;
    const text=await file.text(); let data=JSON.parse(text);
    await saveGames(data); await load();
  };

  await load();
}

document.addEventListener('DOMContentLoaded',()=>initGestion());