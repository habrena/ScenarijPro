const express = require('express');
const path = require('path');
//const fs = require('fs');
const bcrypt = require('bcrypt');

const { Op } = require("sequelize");

const app = express();
const PORT = 3000;

app.use(express.json());
// memorija za zakljucavanje
// format { "scenarioId-lineId": userId }
const lockedLines = {}; 

// format { userId: { scenarioId: 1, lineId: 2 } }
// ovo nam treba da znamo sta user vec drzi da bismo to otkljucali
const userLocks = {};

/*
app.post('/api/scenarios', async (req, res)=>{
    // priprema naslova
    let naslov = req.body.title;
    const userId = req.body.userId; 

    if (!naslov || naslov.trim() === "") { naslov = "Neimenovani scenarij"; }
    if (!userId) { return res.status(400).json({ message: "Korisnik nije identifikovan!" }); }

    try {
        //kreiranje scenarija u bazi
        const noviScenario = await db.Scenario.create({
            title: naslov
        });
        const novaLinija = await db.Line.create({
            lineId: 1, 
            text: "",
            nextLineId: null,
            scenarioId: noviScenario.id //veza sa scenarijem
        });
        const korisnik = await db.User.findByPk(userId);
            if (korisnik) {
                await korisnik.addScenario(noviScenario, { through: { role: 'owner' } });
            } else {
                return res.status(404).json({ message: "Korisnik ne postoji u bazi!" });
            }
        const odgovor = {
            id: noviScenario.id,
            title: noviScenario.title,
            content: [
                {
                    lineId: novaLinija.lineId,
                    nextLineId: novaLinija.nextLineId,
                    text: novaLinija.text
                }
            ]
        };
        res.status(200).json(odgovor);

    } catch (error) {
        console.error("Greška:", error);
        res.status(500).json({ message: "Greška prilikom kreiranja scenarija." });
    }
});
*/
app.post('/api/scenarios', async (req, res) => {
    //u requestu je samo title i userId
    //da li je potrebno ovdje jos sta dodavati?
    let naslov = req.body.title || "Neimenovani scenarij";
    let userId = req.body.userId;

    // validacije
    if (!userId) return res.status(401).json({ message: "Korisnik nije prijavljen." });
    if (!req.body.title?.trim()) return res.status(400).json({ message: "Naslov je obavezan." });

    try {
        const noviScenNovaLinija=await napraviNoviScenario(db, userId, naslov );
        res.status(200).json({
            id: noviScenNovaLinija.noviScenario.id,
            title: noviScenNovaLinija.noviScenario.title,
            content: [{
                lineId: noviScenNovaLinija.novaLinija.lineId,
                text: noviScenNovaLinija.novaLinija.text,
                nextLineId: noviScenNovaLinija.novaLinija.nextLineId // Vraća null
            }]
        });

    } catch (error) {
        console.error("Greška:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

const napraviNoviScenario=async (db, userId,title)=>{
    //provjera korisnika PRIJE kreiranja scenarija i linija
    const korisnik = await db.User.findByPk(userId);
    if (!korisnik) {
        throw new Error("Korisnik nije pronađen.");
    }
    /*
    const noviScenario=await db.Scenario.create({title});
    const novaLinija = await db.Line.create({
            lineId: 1, 
            text: "",
            nextLineId: null, 
            scenarioId: noviScenario.id
        });

    await korisnik.addScenario(noviScenario, { through: { role: 'owner' } });
    return {noviScenario, novaLinija};
    */
   //mnogo bolje rjesenje od ovog gore pod komentarima
   //u slucaju pada konekcije sa bazom, svi dodiri sa bazom padaju
   //sve ili nista
    return await db.sequelize.transaction(async (t) => {
        const noviScenario = await db.Scenario.create(
            { title },
            { transaction: t } //KORISNO: { transaction: t } govori Sequelize-u: "ovu operaciju izvršavaj u okviru transakcije t"
        );

        const novaLinija = await db.Line.create(
            {
                lineId: 1,
                text: "",
                nextLineId: null,
                scenarioId: noviScenario.id
            },
            { transaction: t }
        );

        await korisnik.addScenario(noviScenario, {
            through: { role: 'owner' },
            transaction: t
        });

        return { noviScenario, novaLinija };
    });

}

app.use(express.static(path.join(__dirname, 'public')));

// ruta koja cita scenarij na osnovu ida
app.get('/api/scenarios/:id', async (req, res) => {
     const id = parseInt(req.params.id);

    try {
        //provjera da li scenario postoji
        const scenario = await db.Scenario.findOne({ where: { id: id } });

        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        //dohvatanje svih linija vezanih za taj scenario
        const lines = await db.Line.findAll({ where: { scenarioId: id } });

        //rekonstrukcija povezane liste
        const lineMap = new Map();
        lines.forEach(line => {
            lineMap.set(line.lineId, line);
        });

        const orderedContent = [];
        let currentLineId = 1;
        let maxLoop = lines.length + 10; 
        let counter = 0;

        //krecemo se kroz linije prateci nextLineId
        while (currentLineId !== null && counter < maxLoop) {
            const currentLine = lineMap.get(currentLineId);
            
            if (currentLine) {
                //dodajemo u niz samo podatke koji trebaju klijentu
                orderedContent.push({
                    lineId: currentLine.lineId,
                    nextLineId: currentLine.nextLineId,
                    text: currentLine.text
                });

                //skacmo na iduću liniju
                currentLineId = currentLine.nextLineId;
            } else {
                //ako pointer pokazuje na liniju koja ne postoji, prekidamo
                break;
            }
            counter++;
        }

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: orderedContent
        });

    } catch (error) {
        console.error("Greška pri dohvatanju scenarija:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

//druga ruta - zakljucavanje
app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', async(req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const lineId = parseInt(req.params.lineId);
    const { userId } = req.body;

    const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
    if (!scenario) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }
    const linijaPostoji = await db.Line.findOne({ where: { scenarioId: scenarioId, lineId: lineId } });
    if (!linijaPostoji) {
        return res.status(404).json({ message: "Linija ne postoji!" });
    }
    const lockKey= `${scenarioId}-${lineId}`;

    if (userLocks[userId]) {
        const oldLock = userLocks[userId];
        delete lockedLines[oldLock];
        delete userLocks[userId];
    }

    if (lockedLines[lockKey] && (lockedLines[lockKey] !== userId)) {
        return res.status(409).json({ message: "Linija je vec zakljucana!" });
    }

    lockedLines[lockKey] = userId;
    userLocks[userId] = lockKey;

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

app.put('/api/scenarios/:scenarioId/lines/:lineId', async(req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const lineId = parseInt(req.params.lineId);
    const { userId, newText } = req.body;

    if (!newText || !Array.isArray(newText) || newText.length === 0) {
        return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
    }

    try{

    const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
    if (!scenario) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }
    
    //dohvatamo liniju iz baze
    let trazenaLinija = await db.Line.findOne({ 
        where: { scenarioId: scenarioId, lineId: lineId } 
    });
    if (!trazenaLinija) {
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

    const stigaoJeIstiTekst = (newText.length === 1) && 
                              (newText[0].trim() === trazenaLinija.text.trim());

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

    const timestamp = Math.floor(Date.now() / 1000);
    const originalNextId = trazenaLinija.nextLineId;

    let maxIdResult = await db.Line.max('lineId', { where: { scenarioId: scenarioId } });
    let maxId = maxIdResult || 0;

    let newNextLineIdForFirst = (konacniTekstovi.length > 1) ? (maxId + 1) : originalNextId;

        // UPDATE u bazi
        await trazenaLinija.update({
            text: konacniTekstovi[0],
            nextLineId: newNextLineIdForFirst
        });

    // SPASAVANJE DELTE za prvu liniju
        await db.Delta.create({
            scenarioId: scenarioId,
            type: "line_update",
            lineId: trazenaLinija.lineId,
            nextLineId: newNextLineIdForFirst,
            content: konacniTekstovi[0],
            timestamp: timestamp
        });

    // Kreiranje NOVIH linija
    for (let i = 1; i < konacniTekstovi.length; i++) {
        maxId++; 
        let nextIdZaNovu = (i < konacniTekstovi.length - 1) ? (maxId + 1) : originalNextId;

        // INSERT u bazu (Line)
            await db.Line.create({
                lineId: maxId,
                text: konacniTekstovi[i],
                nextLineId: nextIdZaNovu,
                scenarioId: scenarioId
            });

        // INSERT u bazu (Delta)
            await db.Delta.create({
                scenarioId: scenarioId,
                type: "line_update",
                lineId: maxId,
                nextLineId: nextIdZaNovu,
                content: konacniTekstovi[i],
                timestamp: timestamp
            });
    }
    delete lockedLines[lockKey];
    if (userLocks[userId] === lockKey) {
        delete userLocks[userId];
    }

    res.status(200).json({ message: "Linija je uspjesno azurirana!" });
    } catch (error) {
        console.error("Greška pri updateu:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

const lockedCharacters = {};

app.post('/api/scenarios/:scenarioId/characters/lock', async(req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const { userId, characterName } = req.body;

    try{
    const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
    if (!scenario) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    //lljuč za zakljucavanje je kombinacija scenarija i imena lika
    const charLockKey = `${scenarioId}-${characterName}`;

    //provjera
    if (lockedCharacters[charLockKey] && lockedCharacters[charLockKey] !== userId) {
        return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
    }

    //zakljucaj lika (ili osvjezi lock ako je isti user)
    lockedCharacters[charLockKey] = userId;

    res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
    } catch (error) {
        console.error("Greška pri zaključavanju:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});


app.post('/api/scenarios/:scenarioId/characters/update', async(req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const { userId, oldName, newName } = req.body;

    try{
    const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
    if (!scenario) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    //provjera da li korisnik ima pravo da mijenja
    const charLockKey = `${scenarioId}-${oldName}`;
    
   const lines = await db.Line.findAll({ where: { scenarioId: scenarioId } });

    let promjeneNapravljene = false;

    //format "IME: Tekst..." pa tražimo taj pattern
    for (const line of lines) {
            //provjeravamo da li linija počinje sa "STARO_IME:"
            if (line.text.startsWith(oldName + ":")) {
                
                //zamijeni prvo pojaljivanje starog imena novim
                const noviTekst = line.text.replace(oldName + ":", newName + ":");
                
                //azuriraj objekt i spasi u bazu
                line.text = noviTekst;
                await line.save();
                
                promjeneNapravljene = true;
            }
        }

    if (promjeneNapravljene) {
        await db.Delta.create({
                scenarioId: scenarioId,
                type: "char_rename",
                oldName: oldName,
                newName: newName,
                timestamp: Math.floor(Date.now() / 1000)
            });
    }
    // Otključaj lika nakon izmjene
    delete lockedCharacters[charLockKey];

    res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
    } catch (error) {
        console.error("Greška pri preimenovanju lika:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

app.get('/api/scenarios/:scenarioId/deltas', async(req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const sinceTimestamp = parseInt(req.query.since) || 0; 

    try{
    
    // Provjera scenarija
    const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
    if (!scenario) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    const deltas = await db.Delta.findAll({
            where: {
                timestamp: { [Op.gt]: sinceTimestamp }, // Vrijeme > since
                [Op.or]: [
                    { scenarioId: scenarioId },
                    { type: 'char_rename' }
                ]
            },
            order: [['timestamp', 'ASC']],
            //uzmamo polja koja nam trebaju
            attributes: ['type', 'lineId', 'nextLineId', 'content', 'oldName', 'newName', 'timestamp']
        });

    const cleanDeltas = deltas.map(d => {
            const plainDelta = d.get({ plain: true }); //pretvara Sequelize objekat u obicni JSON

            //ako je tip line_update, brisemo polja za rename
            if (plainDelta.type === 'line_update') {
                delete plainDelta.oldName;
                delete plainDelta.newName;
            }
            //ako je char_rename, brisemo polja za linije
            else if (plainDelta.type === 'char_rename') {
                delete plainDelta.lineId;
                delete plainDelta.nextLineId;
                delete plainDelta.content;
            }
            return plainDelta;
        });

    //slanje odgovora
    res.status(200).json({
        deltas: cleanDeltas
    });
    } catch (error) {
        console.error("Greška pri dohvatanju delti:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

app.post('/api/scenarios/:scenarioId/checkpoint', async (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);

    try {
        //provjera da li scenario uopšte postoji
        const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }
        //kreiranje checkpointa
        const timestamp = Math.floor(Date.now() / 1000);

        await db.Checkpoint.create({
            scenarioId: scenarioId,
            timestamp: timestamp
        });
        res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });

    } catch (error) {
        console.error("Greška pri kreiranju checkpointa:", error);
        res.status(500).json({ message: "Greška na serveru pri kreiranju checkpointa." });
    }
});

app.get('/api/scenarios/:scenarioId/checkpoints', async (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);

    try {
        //provjera da li scenario postoji u bazi
        const scenario = await db.Scenario.findOne({ where: { id: scenarioId } });
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        //dohvatanje svih checkpointa
        const checkpoints = await db.Checkpoint.findAll({
            where: { scenarioId: scenarioId },
            attributes: ['id', 'timestamp']
        });

        res.status(200).json(checkpoints);

    } catch (error) {
        console.error("Greška pri dohvaćanju checkpointa:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});
app.get('/api/scenarios/:scenarioId/restore/:checkpointId', async (req, res) => {
    const scenarioId = parseInt(req.params.scenarioId);
    const checkpointId = parseInt(req.params.checkpointId);

    try {
        //dohvatiti timestamp za checkpointId
        const checkpoint = await db.Checkpoint.findOne({ 
            where: { id: checkpointId, scenarioId: scenarioId } 
        });
        if (!checkpoint) {
            return res.status(404).json({ message: "Checkpoint ne postoji!" });
        }

        //uzeti pocetno stanje scenarija
        const scenario = await db.Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        //dohvatamo linije koje pripadaju scenariju
        const pocetneLinije = await db.Line.findAll({
            where: { scenarioId: scenarioId },
            raw: true
        });

        let stanje = {};
        pocetneLinije.forEach(l => {
            stanje[l.lineId] = {
                lineId: l.lineId,
                nextLineId: l.nextLineId,
                text: l.text
            };
        });

        //dohvatiti delte (timestamp <= checkpoint)
        const delte = await db.Delta.findAll({
            where: {
                scenarioId: scenarioId,
                timestamp: { [Op.lte]: checkpoint.timestamp }
            },
            order: [['timestamp', 'ASC'], ['id', 'ASC']]
        });

        //primijeniti delte na pocetno stanje
        delte.forEach(delta => {
            stanje[delta.lineId] = {
                lineId: delta.lineId,
                nextLineId: delta.nextLineId,
                text: delta.content 
            };
        });

        //pretvaranje mape nazad u niz za JSON odgovor
        const finalniContent = Object.values(stanje);
        res.status(200).json({
            id: scenario.id,
            title: scenario.title, 
            content: finalniContent
        });

    } catch (error) {
        console.error("Greška pri restore-u:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});


const db = require('./data/db.js');

app.post('/api/register', async (req, res) => {
    try {
        //ovdje je greska
        console.log("OVDJE:", req.body);
        const { fullName, email, password, notifFrequency} = req.body;
        if (!password) {
            return res.status(400).json({ message: "Lozinka je obavezna za registraciju!" });
        }

        //provjera
        const postojeciKorisnik = await db.User.findOne({ where: { email: email } });

        if (postojeciKorisnik) {
            return res.status(400).json({ message: "Korisnik s tim emailom već postoji." });
        }

        const noviKorisnik = await db.User.create({
            fullName: fullName,
            email: email,
            password: password,
            notifFrequency: notifFrequency
        });

        const pocetniScenario = await db.Scenario.create({
            title: "Moj prvi scenario"
        });

        await noviKorisnik.addScenario(pocetniScenario, { through: { role: 'owner' } });

        await db.Line.create({
            lineId: 1,         
            text: "",           
            nextLineId: null,  
            scenarioId: pocetniScenario.id
        });

        //res.status(201).json({ message: "Registracija uspješna i scenario kreiran!" });
        res.status(201).json({ 
            message: "Registracija uspješna i scenario kreiran!",
            id: noviKorisnik.id, // OVO DODAJ DA BI FRONTEND MOGAO DA GA SPAŠI
            fullName: noviKorisnik.fullName 
        });
    } catch (error) {
        console.error("Greška pri registraciji:", error);
        res.status(500).send("Greška na serveru.");
    }
});
/*
app.post('/api/register', async (req, res) => {
    try {
        const { ime, email, sifra, frequency} = req.body;
        
        if (!sifra) {
            return res.status(400).json({ message: "Lozinka je obavezna za registraciju!" });
        }

        //provjera
        const postojeciKorisnik = await db.User.findOne({ where: { email: email } });
        
        if (postojeciKorisnik) {
            return res.status(400).json({ message: "Korisnik s tim emailom već postoji." });
        }

        //hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(sifra, salt);

        //Kreiranje korisnika
        const noviKorisnik = await db.User.create({
            fullName: ime,
            email: email,
            password: hashedPassword,
            notifFrequency: frequency
        });

        const pocetniScenario = await db.Scenario.create({
            title: "Moj prvi projekt - " + ime
        });

        await noviKorisnik.addScenario(pocetniScenario, { through: { role: 'owner' } });

        res.status(200).json({ 
            message: "Uspješna registracija!", 
            userId: noviKorisnik.id 
        });

    } catch (error) {
        console.error("Greška na backendu:", error);
        res.status(500).json({ message: "Došlo je do greške prilikom spremanja." });
    }
});
*/

// ruta koja vraća sve scenarije za određenog korisnika
app.get('/api/users/:userId/scenarios', async (req, res) => {
    const userId = parseInt(req.params.userId);

    try {
        //tražimo korisnika i uključujemo njegove scenarije kroz međutabelu
        const korisnik = await db.User.findByPk(userId, {
            include: [{
                model: db.Scenario,
                through: { attributes: [] } // Ne trebaju nam podaci iz međutabele, samo scenariji
            }]
        });

        if (!korisnik) {
            return res.status(404).json({ message: "Korisnik nije pronađen!" });
        }

        res.status(200).json(korisnik.Scenarios);
    } catch (error) {
        console.error("Greška pri dohvatanju projekata:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const korisnik = await db.User.findOne({ where: { email: email } });

        if (!korisnik) {
            return res.status(401).json({ message: "Korisnik ne postoji." });
        }

        const lozinkaTacna = await bcrypt.compare(password, korisnik.password);

        if (!lozinkaTacna) {
            return res.status(401).json({ message: "Pogrešna lozinka." });
        }
        res.status(200).json({
            message: "Uspješna prijava!",
            userId: korisnik.id,
            fullName: korisnik.fullName
        });

    } catch (error) {
        console.error("Greška pri loginu:", error);
        res.status(500).json({ message: "Greška na serveru." });
    }
});

//zaista nepotrebno
async function initializeDatabase() {
    //podaci za delte
    const testDeltas = [
        { scenarioId: 1, type: "line_update", lineId: 1, nextLineId: 2, content: "NARATOR: Sunce je polako zalazilo nad starim gradom.", timestamp: 1736520000 },
        { scenarioId: 1, type: "line_update", lineId: 2, nextLineId: 3, content: "ALICE: Jesi li siguran da je ključ ostao u biblioteci?", timestamp: 1736520010 },
        { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 4, content: "BOB: To je posljednje mjesto gdje sam ga vidio prije nego što je pala noć.", timestamp: 1736520020 },
        { scenarioId: 1, type: "line_update", lineId: 4, nextLineId: 5, content: "ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata.", timestamp: 1736520030 },
        { scenarioId: 1, type: "line_update", lineId: 5, nextLineId: 6, content: "BOB: Čekaj, čuješ li taj zvuk iza polica?", timestamp: 1736520040 },
        { scenarioId: 1, type: "line_update", lineId: 6, nextLineId: null, content: "NARATOR: Iz sjene se polako pojavila nepoznata figura.", timestamp: 1736520050 },
        { scenarioId: 1, type: "char_rename", oldName: "BOB", newName: "ROBERT", timestamp: 1736520100 },
        { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 7, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768208370 },
        { scenarioId: 1, type: "line_update", lineId: 7, nextLineId: 8, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768208370 },
        { scenarioId: 1, type: "line_update", lineId: 8, nextLineId: 4, content: "riječ riječ riječ riječ riječ", timestamp: 1768208370 },
        { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 9, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768422623 },
        { scenarioId: 1, type: "line_update", lineId: 9, nextLineId: 10, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768422623 },
        { scenarioId: 1, type: "line_update", lineId: 10, nextLineId: 7, content: "riječ riječ riječ riječ riječ", timestamp: 1768422623 },
        { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 11, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768422736 },
        { scenarioId: 1, type: "line_update", lineId: 11, nextLineId: 12, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768422736 },
        { scenarioId: 1, type: "line_update", lineId: 12, nextLineId: 9, content: "riječ riječ riječ riječ riječ", timestamp: 1768422736 },
        { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 13, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768423005 },
        { scenarioId: 1, type: "line_update", lineId: 13, nextLineId: 14, content: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ", timestamp: 1768423005 },
        { scenarioId: 1, type: "line_update", lineId: 14, nextLineId: 11, content: "riječ riječ riječ riječ riječ", timestamp: 1768423005 }
    ];

    // podaci za linije
    const finalneLinije = [
        { lineId: 1, nextLineId: 2, text: "NARATOR: Sunce je polako zalazilo nad starim gradom." },
        { lineId: 2, nextLineId: 3, text: "ALICE: Jesi li siguran da je ključ ostao u biblioteci?" },
        { lineId: 3, nextLineId: 13, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
        { lineId: 13, nextLineId: 14, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
        { lineId: 14, nextLineId: 11, text: "riječ riječ riječ riječ riječ" },
        { lineId: 11, nextLineId: 12, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
        { lineId: 12, nextLineId: 9, text: "riječ riječ riječ riječ riječ" },
        { lineId: 9, nextLineId: 10, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
        { lineId: 10, nextLineId: 7, text: "riječ riječ riječ riječ riječ" },
        { lineId: 7, nextLineId: 8, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
        { lineId: 8, nextLineId: 4, text: "riječ riječ riječ riječ riječ" },
        { lineId: 4, nextLineId: 5, text: "ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata." },
        { lineId: 5, nextLineId: 6, text: "BOB: Čekaj, čuješ li taj zvuk iza polica?" },
        { lineId: 6, nextLineId: null, text: "NARATOR: Iz sjene se polako pojavila nepoznata figura." }
    ];

    try {
        //kreiranje scenarija iz testnog scenarija
        const s1 = await db.Scenario.create({
            title: "Potraga za izgubljenim ključem"
        });

        //ubacivanje linija testnog scenarija
        for (const linija of finalneLinije) {
            await db.Line.create({
                lineId: linija.lineId,
                text: linija.text,
                nextLineId: linija.nextLineId,
                scenarioId: s1.id
            });
        }

        //ubacivanje delta
        for (const delta of testDeltas) {
            await db.Delta.create({
                scenarioId: s1.id,
                type: delta.type,
                lineId: delta.lineId || null,
                nextLineId: delta.nextLineId || null,
                content: delta.content || null,
                oldName: delta.oldName || null,
                newName: delta.newName || null,
                timestamp: delta.timestamp
            });
        }
        console.log("Inicijalni podaci su uspješno ubačeni!");

    } catch (e) {
        console.error("Greška pri inicijalizaciji podataka:", e);
    }
}

db.sequelize.sync({ alter: true }).then(async () => {
    console.log("Tabele su uspješno kreirane!");
    //await initializeDatabase();

    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server radi na http://localhost:${PORT}/projects.html`);
    });
}).catch((err) => {
    console.error("Greška pri sinhronizaciji baze:", err);
});