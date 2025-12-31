const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
// memorija za zakljucavanje
// format { "scenarioId-lineId": userId }
const lockedLines = {}; 

// format { userId: { scenarioId: 1, lineId: 2 } }
// ovo nam treba da znamo sta user vec drzi da bismo to otkljucali
const userLocks = {};



app.post('/api/scenarios',(req, res)=>{
    // priprema naslova
    let naslov = req.body.title;
    if (!naslov || naslov.trim() === "") {naslov="Neimenovani scenarij";}

    const folderPutanja = path.join(__dirname, 'data', 'scenarios');
    
    //ako folder ne postoji, napravi ga
    if (!fs.existsSync(folderPutanja)) {
        fs.mkdirSync(folderPutanja, { recursive: true });
    }

    const fajlovi = fs.readdirSync(folderPutanja);
    let maxId = 0;

    fajlovi.forEach(fajl => {
        if (fajl.startsWith('scenario-') && fajl.endsWith('.json')) {
            const broj = parseInt(fajl.replace('scenario-', '').replace('.json', ''));

            if (!isNaN(broj) && broj > maxId){maxId=broj;}
        }
    });
    
    const noviId=maxId+1;

    //kreiranje objekta
    const noviScenarij = {
        id: noviId,
        title: naslov,
        content: [ 
            {
                lineId: 1,
                nextLineId: null,
                text: "" 
            }
        ]
    };
    const nazivNovogFajla = `scenario-${noviId}.json`;
    const punaPutanja = path.join(folderPutanja, nazivNovogFajla);

    try {
        fs.writeFileSync(punaPutanja, JSON.stringify(noviScenarij, null, 2));
        res.status(200).json(noviScenarij);
    } catch (error) {
        res.status(500).json({ message: "Greška prilikom kreiranja fajla." });
    }
});


app.use(express.static(path.join(__dirname, 'public')));

// ruta koja čita scenarij na osnovu ida
app.get('/api/scenarios/:id', (req, res) => {
    const id = req.params.id; // Ovo će biti '1'
    const putanjaDoFajla = path.join(__dirname, 'data', 'scenarios', `scenario-${id}.json`); //svidja mi se ovo umjesto stavljanja prave putanje

    //provjeravamo postoji li fajl
    if (fs.existsSync(putanjaDoFajla)) {
        try {
            const sadrzaj = fs.readFileSync(putanjaDoFajla, 'utf8');
            const jsonSadrzaj = JSON.parse(sadrzaj);
            
            res.status(200).json(jsonSadrzaj);
        } catch (err) {
            res.status(404).json({ message: "Scenario ne postoji!" });
        }
    } else {
        res.status(404).json({ message: "Scenario ne postoji!" });
    }
});

//druga ruta - zakljucavanje
app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const lineId = parseInt(req.params.lineId);
    const userId = req.body.userId; //salje json samo sa kljucem korisnika

  
    const putanja = path.join(__dirname, 'data', 'scenarios', `scenario-${scenarioId}.json`);
    
    if (!fs.existsSync(putanja)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    // citanje fajla
    const scenario = JSON.parse(fs.readFileSync(putanja, 'utf8'));
    
    
    const linijaPostoji = scenario.content.find(l => l.lineId === lineId);
    if (!linijaPostoji) {
        return res.status(404).json({ message: "Linija ne postoji!" });
    }

   
    const lockKey= `${scenarioId}-${lineId}`;
    if (lockedLines[lockKey] && (lockedLines[lockKey] !== userId)) {
        return res.status(409).json({ message: "Linija je vec zakljucana!" });
    }

   
    if (userLocks[userId]) {
        const oldLock = userLocks[userId];
        const oldKey = `${oldLock.scenarioId}-${oldLock.lineId}`;
        delete lockedLines[oldKey]; // Brišemo stari lock
    }


    lockedLines[lockKey] = userId;
    userLocks[userId] = { scenarioId, lineId };

    res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
});

function prelomiTekst(tekst) {
    const tokeni = tekst.trim().split(/\s+/);
    
    const linije = [];
    let trenutnaLinijaTokeni = [];
    let brojPravihRijeci = 0;
    const jeLiPravaRijec = (token) => {
        // Ukloni HTML tagove
        let cistiToken = token.replace(/<[^>]*>/g, '');
        // Ukloni interpunkciju sa početka i kraja (zadrži unutrašnje crtice i apostrofe)
        cistiToken = cistiToken.replace(/^[.,!?;:()"]+|[.,!?;:()"]+$/g, '');

        if (cistiToken.length === 0) return false;
        // Ako je broj, nije riječ
        if (!isNaN(cistiToken)) return false;
        return true;
    };

    for (let i = 0; i < tokeni.length; i++) {
        const token = tokeni[i];
        
        // Dodajemo token u trenutnu liniju bez obzira šta je (riječ, broj, interpunkcija)
        trenutnaLinijaTokeni.push(token);

        // Provjeravamo da li ga trebamo UBROJATI u limit
        if (jeLiPravaRijec(token)) {
            brojPravihRijeci++;
        }

        if (brojPravihRijeci === 20) {
            linije.push(trenutnaLinijaTokeni.join(" "));

            trenutnaLinijaTokeni = [];
            brojPravihRijeci = 0;
        }
    }
    
    if(trenutnaLinijaTokeni.length>0) {
        linije.push(trenutnaLinijaTokeni.join(" "));
    }
    return linije;
}


app.put('/api/scenarios/:scenarioId/lines/:lineId', (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const lineId = parseInt(req.params.lineId);
    const { userId, newText } = req.body;

    if (!newText || !Array.isArray(newText) || newText.length === 0) {
        return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
    }

    const putanja = path.join(__dirname, 'data', 'scenarios', `scenario-${scenarioId}.json`);
    if (!fs.existsSync(putanja)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    let scenario = JSON.parse(fs.readFileSync(putanja, 'utf8'));
    
    // Pronađi indeks trenutne linije
    const indexLinije = scenario.content.findIndex(l => l.lineId === lineId);
    if (indexLinije === -1) {
        return res.status(404).json({ message: "Linija ne postoji!" });
    }
    
    //provjera lockanja
    const lockKey = `${scenarioId}-${lineId}`;
    if (!lockedLines[lockKey]) {
        return res.status(409).json({ message: "Linija nije zakljucana!" });
    }

    // ako je zaključana, provjeri da li je zaključao neko drugi
    if (lockedLines[lockKey] !== userId) {
        return res.status(409).json({ message: "Linija je vec zakljucana!" });
    }

    let trenutniObjekat = scenario.content[indexLinije];

    const stigaoJeIstiTekst = (newText.length === 1) && 
                              (newText[0].trim() === trenutniObjekat.text.trim());

    if (stigaoJeIstiTekst) {
        
        // Samo otključaj liniju
        delete lockedLines[lockKey];
        if (userLocks[userId] === lockKey) {
            delete userLocks[userId];
        }

        return res.status(200).json({ message: "Nema promjena" });
    }

    let konacniTekstovi = [];
    newText.forEach(stringLinija => {
        konacniTekstovi.push(...prelomiTekst(stringLinija));
    });

    let deltasToSave = [];
    const timestamp = Math.floor(Date.now() / 1000);

    let maxId = 0;
    scenario.content.forEach(l => { if (l.lineId > maxId) maxId = l.lineId; });

    const originalNextId = trenutniObjekat.nextLineId;

    // Ažuriranje PRVE linije
    trenutniObjekat.text = konacniTekstovi[0];
    
    if (konacniTekstovi.length > 1) {
        trenutniObjekat.nextLineId = maxId + 1; 
    } else {
        trenutniObjekat.nextLineId = originalNextId;
    }

    deltasToSave.push({
        scenarioId: scenarioId,
        type: "line_update",
        lineId: trenutniObjekat.lineId,
        nextLineId: trenutniObjekat.nextLineId,
        content: trenutniObjekat.text,
        timestamp: timestamp
    });

    // Kreiranje NOVIH linija
    for (let i = 1; i < konacniTekstovi.length; i++) {
        maxId++; 
        let nextIdZaNovu = (i < konacniTekstovi.length - 1) ? (maxId + 1) : originalNextId;

        const novaLinija = {
            lineId: maxId,
            nextLineId: nextIdZaNovu,
            text: konacniTekstovi[i]
        };

        //scenario.content.push(novaLinija);
        scenario.content.splice(indexLinije + i, 0, novaLinija);

        deltasToSave.push({
            scenarioId: scenarioId,
            type: "line_update",
            lineId: novaLinija.lineId,
            nextLineId: novaLinija.nextLineId,
            content: novaLinija.text,
            timestamp: timestamp
        });
    }

    //cuvanje json objekata
    fs.writeFileSync(putanja, JSON.stringify(scenario, null, 2));

    const deltaFolder = path.join(__dirname, 'data'); 
    const deltaPutanja = path.join(deltaFolder, 'deltas.json');
    
    let existingDeltas = [];
    if (fs.existsSync(deltaPutanja)) {
        try {
            existingDeltas = JSON.parse(fs.readFileSync(deltaPutanja, 'utf8'));
        } catch (e) { existingDeltas = []; }
    }
    
    existingDeltas.push(...deltasToSave);
    fs.writeFileSync(deltaPutanja, JSON.stringify(existingDeltas, null, 2));


    delete lockedLines[lockKey];
    if (userLocks[userId] === lockKey) {
        delete userLocks[userId];
    }

    res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});

const lockedCharacters = {};
app.post('/api/scenarios/:scenarioId/characters/lock', (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const { userId, characterName } = req.body;

    const putanja = path.join(__dirname, 'data', 'scenarios', `scenario-${scenarioId}.json`);
    if (!fs.existsSync(putanja)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    // lljuč za zaključavanje je kombinacija scenarija i imena lika
    const charLockKey = `${scenarioId}-${characterName}`;

    // Provjera:
    if (lockedCharacters[charLockKey] && lockedCharacters[charLockKey] !== userId) {
        return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
    }

    // Zaključaj lika (ili osvježi lock ako je isti user)
    lockedCharacters[charLockKey] = userId;

    res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post('/api/scenarios/:scenarioId/characters/update', (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const { userId, oldName, newName } = req.body;

    const putanja = path.join(__dirname, 'data', 'scenarios', `scenario-${scenarioId}.json`);
    if (!fs.existsSync(putanja)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    // Provjera da li korisnik ima pravo da mijenja (mora držati lock)
    const charLockKey = `${scenarioId}-${oldName}`;
    let scenario = JSON.parse(fs.readFileSync(putanja, 'utf8'));

    const lineMap = new Map();
    scenario.content.forEach(line => lineMap.set(line.lineId, line));

    let promjeneNapravljene = false;

    scenario.content.forEach(line => {
        if (line.text === oldName) {
            
            // Regex provjera: Samo velika slova i razmaci, bez brojeva/interpunkcije
            const isAllUppercaseLetters = /^[A-Z\s]+$/.test(line.text);
            
            if (isAllUppercaseLetters) {
                // provjera sljedeće linije (nextLineId)
                const nextLine = lineMap.get(line.nextLineId);
                
                if (nextLine) {
                    const nextText = nextLine.text.trim();
                    const nextIsAllApps = /^[A-Z\s]+$/.test(nextLine.text); // Da li je i sljedeća ALL CAPS?
                    
                    // provjera sljedeća nije prazna i nije all Caps
                    if (nextText.length > 0 && !nextIsAllApps) {
                        // SVI USLOVI ISPUNJENI -> MIJENJAMO IME
                        line.text = newName;
                        promjeneNapravljene = true;
                    }
                }
            }
        }
    });

    if (promjeneNapravljene) {
        fs.writeFileSync(putanja, JSON.stringify(scenario, null, 2));
        const deltaFolder = path.join(__dirname, 'data');
        const deltaPutanja = path.join(deltaFolder, 'deltas.json');
        
        const noviDeltaZapis = {
            type: "char_rename",
            oldName: oldName,
            newName: newName,
            timestamp: Math.floor(Date.now() / 1000)
        };

        let deltas = [];
        if (fs.existsSync(deltaPutanja)) {
            try {
                deltas = JSON.parse(fs.readFileSync(deltaPutanja, 'utf8'));
            } catch (e) { deltas = []; }
        }
        deltas.push(noviDeltaZapis);
        fs.writeFileSync(deltaPutanja, JSON.stringify(deltas, null, 2));
    }
    // Otključaj lika nakon izmjene
    delete lockedCharacters[charLockKey];

    res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});

app.get('/api/scenarios/:scenarioId/deltas', (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const sinceTimestamp = parseInt(req.query.since) || 0; 

    // Putanje
    const putanjaDoScenarija = path.join(__dirname, 'data', 'scenarios', `scenario-${scenarioId}.json`);
    const putanjaDoDelti = path.join(__dirname, 'data', 'deltas.json');
    
    // Provjera scenarija
    if (!fs.existsSync(putanjaDoScenarija)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    let allDeltas = [];
    try {
        if (fs.existsSync(putanjaDoDelti)) {
            const data = fs.readFileSync(putanjaDoDelti, 'utf8');
            if (data.trim().length > 0) {
                allDeltas = JSON.parse(data);
            }
        }
    } catch (err) {
        console.error("Greška pri čitanju deltas.json:", err);
        allDeltas = [];
    }

    const filteredDeltas = allDeltas.filter(delta => {
        // prvo provjeri timestamp (vrijedi za sve)
        if (delta.timestamp <= sinceTimestamp) {
            return false;
        }

        if (delta.type === 'char_rename') {
            return true;
        }
     return delta.scenarioId === scenarioId;
    });

    // Sortiranje
    filteredDeltas.sort((a, b) => a.timestamp - b.timestamp);

    // Slanje odgovora
    res.status(200).json({
        deltas: filteredDeltas
    });
});

app.listen(PORT, () => {
    console.log(`Server radi na http://localhost:${PORT}/projects.html`); //eh
});
