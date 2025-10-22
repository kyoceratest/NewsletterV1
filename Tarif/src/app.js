const express = require('express');
const session = require('express-session');
const path = require('path');
const auth = require('./auth');
const roles = require('./roles');

const app = express();
const PORT = process.env.PORT || 3000;

const filesByRole = {
  grossiste: [
    { name: "Équipement (PDF)", url: "../downloads/grossiste_equipement.pdf" },
    { name: "Équipement (Excel)", url: "../downloads/grossiste_equipement.xlsx" },
    { name: "Consommables (PDF)", url: "../downloads/grossiste_consommables.pdf" },
    { name: "Consommables (Excel)", url: "../downloads/grossiste_consommables.xlsx" }
  ],
  hexapage: [
    { name: "Matériel (PDF)", url: "../downloads/hexapage_materiel.pdf" },
    { name: "Matériel (Excel)", url: "../downloads/hexapage_materiel.xlsx" },
    { name: "Consommables (PDF)", url: "../downloads/hexapage_consommables.pdf" },
    { name: "Consommables (Excel)", url: "../downloads/hexapage_consommables.xlsx" }
  ],
  koesio: [
    { name: "Matériel (PDF)", url: "../downloads/koesio_materiel.pdf" },
    { name: "Matériel (Excel)", url: "../downloads/koesio_materiel.xlsx" },
    { name: "Consommables (PDF)", url: "../downloads/koesio_consommables.pdf" },
    { name: "Consommables (Excel)", url: "../downloads/koesio_consommables.xlsx" }
  ],
  kyoxpert: [
    { name: "Matériel (PDF)", url: "../downloads/kyoxpert_materiel.pdf" },
    { name: "Matériel (Excel)", url: "../downloads/kyoxpert_materiel.xlsx" },
    { name: "Consommables (PDF)", url: "../downloads/kyoxpert_consommables.pdf" },
    { name: "Consommables (Excel)", url: "../downloads/kyoxpert_consommables.xlsx" }
  ],
  public: [
    { name: "Équipement (PDF)", url: "../downloads/public_equipement.pdf" },
    { name: "Équipement (Excel)", url: "../downloads/public_equipement.xlsx" },
    { name: "Consommables (PDF)", url: "../downloads/public_consommables.pdf" },
    { name: "Consommables (Excel)", url: "../downloads/public_consommables.xlsx" }
  ]
};

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/login', (req, res) => {
    const { role, password } = req.body;
    if (auth.authenticate(role, password)) {
        req.session.role = role;
        res.redirect('/downloads');
    } else {
        res.send('Invalid credentials');
    }
});

app.get('/downloads', (req, res) => {
    if (!req.session.role) {
        return res.status(403).send('Access denied. Please log in.');
    }
    const role = req.session.role;
    res.sendFile(path.join(__dirname, `../src/downloads/${roles.getDownloadFile(role)}`));
});

// Après authentification réussie, afficher les liens :
function showDownloadLinks(role) {
  const linksList = document.getElementById('linksList');
  linksList.innerHTML = '';
  filesByRole[role].forEach(file => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${file.url}" download>${file.name}</a>`;
    linksList.appendChild(li);
  });
  document.getElementById('downloadLinks').style.display = 'block';
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});