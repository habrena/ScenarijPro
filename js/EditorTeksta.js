let EditorTeksta=function(divRef){
    if (!(divRef instanceof Element) || divRef.tagName !== 'DIV'){
        throw new Error("Pogresan tip elementa!");
    }

    // provjera contenteditable atributa
    if (divRef.getAttribute('contenteditable') !== 'true') {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }
    //konstruktorrr
    const editorDiv = divRef;

    const prebrojiRijeciUTekstu = function(tekst) {
        const tekst2 = tekst.trim();
        if (tekst2 === '') {
            return 0;
        }
        const wordRegex = /[a-zA-Z][a-zA-Z0-9'-]*/g;
        const rijeci = tekst2.match(wordRegex);
        //ako matcha regex salji duzinu teksta
        return rijeci ? rijeci.length : 0;
    };
    
    let dajBrojRijeci = function () {
        let ukupnoRijeci = 0;
        let boldirane = 0;
        let italic= 0;
        //ne trazi se underlined!

        const tekst2 = editorDiv.innerText;
        ukupnoRijeci = prebrojiRijeciUTekstu(tekst2);
        const klon = editorDiv.cloneNode(true); //treba li mi ovo? provjeriti bez ovog
        
        const boldElementi = klon.querySelectorAll('b, strong, [style*="font-weight: bold"]');
        boldElementi.forEach(el => {
            boldirane += prebrojiRijeciUTekstu(el.innerText);
        });

        const italicElementi = klon.querySelectorAll('i, em, [style*="font-style: italic"]');
        italicElementi.forEach(el => {
            italic+= prebrojiRijeciUTekstu(el.innerText);
        });
        
        return {
            ukupno: ukupnoRijeci,
            boldiranih: boldirane,
            italic: italic
        };
    };
    const dohvatiSveLinije = function() {
        const sadrzaj = editorDiv.innerHTML;
        // zmjenjuje block elemente i <br> sa novom linijom i HTML tagove za razmak
        let tekst = sadrzaj.replace(/<br\s*\/?>/gi, '\n')
                          .replace(/<\/p>|<\/div>|<\/h1>/gi, '\n')
                          .replace(/&nbsp;/gi, ' ')
                          .trim();

        // salje tekst podijeljen na array linije
        return tekst.split('\n')
                   .map(linija => {
                       const n = document.createElement('div');
                       n.innerHTML = linija;
                       return n.textContent.replace(/\u200B/g, ''); //zero-width space koji se zna cesto naci u ovim contenteditable text editorima
                   });
    };

    const dohvatiLinije = function() {
        return dohvatiSveLinije()
                   .map(linija => linija.trim())
                   .filter(linija => linija.length > 0);
    };
    const jeLiNaslovScene = function(linija) {
        const velikaLinija = linija.toUpperCase();
        // mora početi sa INT. ili EXT.
        if (!velikaLinija.startsWith("INT.") && !velikaLinija.startsWith("EXT.")) {
            return false;
        }
        // mora sadržavati crticu, razmak i jednu od ključnih riječi
        const timeRegex = /-\s(DAY|NIGHT|AFTERNOON|MORNING|EVENING)$/;
        return timeRegex.test(velikaLinija);
    };
    const jeLiLinijaUZagradama = function(linija) {
        // Provjerava da li trimovana linija počinje i završava sa zagradama
        return linija.startsWith('(') && linija.endsWith(')');
    };

    const daLiJeVelikoSlovo = function(linija) {
        if (jeLiNaslovScene(linija)) {
            return false;
        }
        return linija.length > 0 && linija === linija.toUpperCase() && /[A-Z]/i.test(linija);
    };

    let dajUloge = function () {
        const linije = dohvatiLinije();
        const pronadjeneUloge = new Set(); //koristi se set da ne dupliciramo uloge; lakse je
        

        for (let i = 0; i < linije.length; i++) {
            const trenutnaLinija = linije[i];
            const sljedecaLinija = linije[i + 1];

            const potencijalnaUloga= daLiJeVelikoSlovo(trenutnaLinija);

            if (potencijalnaUloga) {
                //BITNOOOOO: provjera da li u imenu ima brojeva i interpunkcijskih znakova
                const ulogaSkracena = trenutnaLinija.trim();
                const sadrziNedozvoljeneZnakove = /[^A-Z\s]/.test(ulogaSkracena);

                if (sadrziNedozvoljeneZnakove) {
                    continue; 
                }
                const imaSljedeceLinije = sljedecaLinija !== undefined;
                
                if (imaSljedeceLinije) {
                    const daLiJeDijalog = sljedecaLinija.trim().length > 0 && !daLiJeVelikoSlovo(sljedecaLinija);
                    
                    if (daLiJeDijalog) {
                        const uloga = ulogaSkracena;
                        if (!pronadjeneUloge.has(uloga)) {
                            pronadjeneUloge.add(uloga);
                        }
                    }
                }
            }
        }
        return Array.from(pronadjeneUloge);
    };
    //BITNO: potrebna pomocna funkcija za metodu pogresneUloge()
    const nesto= function(s1, s2) {
            const str1 = s1.toLowerCase().trim();
            const str2 = s2.toLowerCase().trim();
            const m = str1.length;
            const n = str2.length;
            
            if (Math.abs(m - n) > 2) return 3; 

            const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

            for (let i = 0; i <= m; i++) dp[i][0] = i;
            for (let j = 0; j <= n; j++) dp[0][j] = j;

            for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                    const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,      
                        dp[i][j - 1] + 1,     
                        dp[i - 1][j - 1] + cost 
                    );
                }
            }
            return dp[m][n];
    };
    const jeLiVrloSlicno = function(ime1, ime2) {
            const udaljenost =nesto(ime1, ime2);
            const maxDuzina = Math.max(ime1.trim().length, ime2.trim().length); 

            if (maxDuzina <= 5) {
                return udaljenost <= 1;
            } else {
                return udaljenost <= 2;
            }

    };
    const dohvatiSveUlogeSaFrekvencijom = function() {
        const linije = dohvatiLinije();
        const frekvencijaUloga = new Map();
        //koristili bismo dajUloge() funkciju da nam ne treba frekvencija za svaku ulogu
        //ovako je potrebno ponovno kodiranje iste funkcije

        for (let i = 0; i < linije.length; i++) {
            const trenutnaLinija = linije[i];
            const sljedecaLinija = linije[i + 1];

            const jeKandidatZaUlogu = daLiJeVelikoSlovo(trenutnaLinija);

            if (jeKandidatZaUlogu) {
                const imaSljedeceLinije = sljedecaLinija !== undefined;
                
                if (imaSljedeceLinije) {
                    const jeDijalog = sljedecaLinija.trim().length > 0 && !daLiJeVelikoSlovo(sljedecaLinija);
                    
                    if (jeDijalog) {
                        const imeUloge = trenutnaLinija.trim();
                        frekvencijaUloga.set(imeUloge, (frekvencijaUloga.get(imeUloge) || 0) + 1);
                    }
                }
            }
        }

        return frekvencijaUloga;
    };

    let pogresnaUloga = function() {
            const frekvencijaUloga = dohvatiSveUlogeSaFrekvencijom();
            const imenaUloga = Array.from(frekvencijaUloga.keys()); // niz jedinstvenih imena
            const pogresneUloge = new Set();

            for (let i = 0; i < imenaUloga.length; i++) {
                const imeA = imenaUloga[i];
                const countA = frekvencijaUloga.get(imeA);

                for (let j = 0; j < imenaUloga.length; j++) {
                    const imeB = imenaUloga[j];

                    if (imeA === imeB) continue; 
                    const countB = frekvencijaUloga.get(imeB);
                    const slicno = jeLiVrloSlicno(imeA, imeB);
                    const frekventno = (countB >= 4) && (countB >= countA + 3);

                    if (slicno && frekventno) {
                        pogresneUloge.add(imeA);
                        break; 
                    }
                }
            }
            // vraćamo niz pogrešnih uloga
            return Array.from(pogresneUloge);
    };
    let brojLinijaTeksta = function(uloga) {
            if (!uloga || uloga.trim() === "") return 0;
            
            const targetUloga = uloga.trim().toUpperCase();
            const linije = dohvatiLinije();
            let brojacLinija = 0;
            
            const jeUloga = (linija) => linija.trim().toUpperCase() === targetUloga;

            for (let i = 0; i < linije.length; i++) {
                const trenutnaLinija = linije[i];
                if (jeUloga(trenutnaLinija)) {
                    let j = i + 1;
                    while (j < linije.length) {
                        const linijaDijalog = linije[j];

                        if (linijaDijalog.trim() === "" || jeLiNaslovScene(linijaDijalog)) {
                            break;
                        }
                        if (daLiJeVelikoSlovo(linijaDijalog)) {
                            break;
                        }
                        if (!jeLiLinijaUZagradama(linijaDijalog)) {
                            brojacLinija++;
                        }
                        
                        j++;
                    }
                    i = j - 1;
                }
            }

            return brojacLinija;
       
    };
let scenarijUloge = function(uloga) {
    if (!uloga || uloga.trim() === "") return [];

    const target = uloga.trim().toUpperCase();
    const linije = dohvatiSveLinije(); 
    const rezultat = [];

    // Pomoćne funkcije iz konteksta
    const jeUloga = linija =>linija.trim().length > 0 && linija === linija.toUpperCase() && /[A-Z]/.test(linija) && !jeLiNaslovScene(linija);

    let trenutnaScena = "NO SCENE";
    let replike = [];
    
    let i = 0;
    while (i < linije.length) {
        let linija = linije[i].trim();

        if (jeLiNaslovScene(linija)) {
            trenutnaScena = linija;
            i++;
            continue;
        }

        if (!jeUloga(linija)) {
            i++;
            continue;
        }

        let imeUloge = linija;
        let j = i + 1;
        let blok = [];

        while (j < linije.length) {
            const l2 = linije[j].trim();

            if (l2 === "") {
                j++;
                continue;   
            }
            if (jeLiNaslovScene(l2)) break;
            if (jeUloga(l2)) break;

            if (!jeLiLinijaUZagradama(l2)) {
                blok.push(l2);
            }

            j++;
        }

        if (blok.length > 0) {
            replike.push({
                scena: trenutnaScena,
                uloga: imeUloge,
                linije: blok
            });
        }

        i = j;
    }
    for (let idx = 0; idx < replike.length; idx++) {
        const r = replike[idx];

        if (r.uloga.toUpperCase() !== target) continue;
        const scena = r.scena;
        const replikeUSceni = replike.filter(x => x.scena === scena);
        const pozicija = replikeUSceni.indexOf(r) + 1;
        const idxUSceni = replikeUSceni.indexOf(r);

        let prethodni = null;
        let sljedeci = null;

        if (idxUSceni>0) {
            const p = replikeUSceni[idxUSceni - 1];
            prethodni={
                uloga: p.uloga,
                linije: p.linije
            };
        }
        if (idxUSceni<replikeUSceni.length-1) {
            const s=replikeUSceni[idxUSceni+1];
            sljedeci={
                uloga: s.uloga,
                linije: s.linije
            };
        }
        rezultat.push({
            scena: scena,
            pozicijaUTekstu: pozicija,
            prethodni: prethodni,
            trenutni:{
                uloga: r.uloga,
                linije: r.linije
            },
            sljedeci: sljedeci
        });
    }
    return rezultat;
};
let grupisiUloge=function(){
//nedovrseno :(
}
    let formatirajTekst = function(komanda) {
            // provjera dozvoljenih komandi
            if (['bold', 'italic', 'underline'].indexOf(komanda) === -1) {
                 console.warn(`Nepoznata komanda za formatiranje: ${komanda}`);
                 return false;
            }
            const selection = window.getSelection();

            if (!selection.rangeCount || selection.isCollapsed) {
                return false;
            }

            const range = selection.getRangeAt(0);
            if (!editorDiv.contains(range.startContainer) || !editorDiv.contains(range.endContainer)) {
                return false;
            }
            document.execCommand(komanda, false, null);
            return true;
    };

    return { 
        dajBrojRijeci: dajBrojRijeci, 
        dajUloge: dajUloge, 
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        scenarijUloge:scenarijUloge,
        grupisiUloge: grupisiUloge,
        formatirajTekst:formatirajTekst
    }
}