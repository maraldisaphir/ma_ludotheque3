// Placeholder minimal pour éviter une 404 si tu n'as pas encore branché Netlify Blobs.
// Remplace par ton script existant ou colle ici tes fonctions.
// IDs disponibles côté DOM:
//   Consultation: #search, #f-type, #f-age, #f-min, #f-max, #tbody
//   Gestion: #btn-import, #import-input, #btn-export, #btn-add, #games-list
//   Modale: #modal, #modal-form, #btn-delete (+ champs f-*)
console.info('[ludo] script.js placeholder chargé.');

(function(){
  const tbody = document.getElementById('tbody');
  const list = document.getElementById('games-list');
  if (tbody && !tbody.childElementCount) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'Aucun jeu chargé (brancher Netlify Blobs dans script.js).';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  if (list && !list.childElementCount) {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = 'Aucune donnée — ajoute un jeu via le bouton "Ajouter" une fois les Blobs branchés.';
    list.appendChild(div);
  }
  // Hook simple sur "Ajouter" pour ouvrir la modale
  const btnAdd = document.getElementById('btn-add');
  if (btnAdd) btnAdd.addEventListener('click', () => window.__ludo?.openModal?.({}));
  // Prévisualisation de l’image dans la modale
  const photoInput = document.getElementById('f-photo');
  if (photoInput){
    photoInput.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = document.getElementById('preview');
      if (img) img.src = url;
    });
  }
})();
