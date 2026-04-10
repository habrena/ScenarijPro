const divEditor = document.getElementById("divEditor");
let editor = EditorTeksta(divEditor);
const porukeDiv = document.getElementById("poruke");

const currentUserId = "testUser1";
let autoSaveTimer = null; // Timer za interval
const INTERVAL_CEKANJA = 5000;


document.getElementById("dugmeBrojRijeci").addEventListener('click', () => {
    const rezultat = editor.dajBrojRijeci();
    porukeDiv.innerHTML = `<b>Broj Rijeci:</b> Ukupno: ${rezultat.ukupno}, Boldiranih: ${rezultat.boldiranih}, Italic: ${rezultat.italic}`;
});


document.getElementById("dugmeDajUloge").addEventListener('click', () => {
    const uloge = editor.dajUloge();
    if (uloge.length === 0) {
        porukeDiv.innerHTML = '<b>Daj Uloge:</b> Nema pronađenih uloga u tekstu.';
    } else {
        porukeDiv.innerHTML = `<b>Pronađene Uloge:</b> ${uloge.join(', ')}`;
    }
});

document.getElementById("dugmePogresnaUloga").addEventListener('click', () => {
    const pogresneUloge = editor.pogresnaUloga();
    if (pogresneUloge.length === 0) {
        porukeDiv.innerHTML = '<b>Pogrešna Uloga:</b> Nema pronađenih pogrešno formatiranih uloga.';
    } else {
        porukeDiv.innerHTML = `<b>Pogrešno Formatirane Uloge:</b> ${pogresneUloge.join(', ')}`;
    }
});

document.getElementById("dugmeBrojLinijaTeksta").addEventListener('click', () => {
    const inputUloga = document.getElementById("inputUloga"); // Dodano jer je falila definicija
    const ulogaZaAnalizu = inputUloga.value.trim().toUpperCase(); 
    
    if (ulogaZaAnalizu === '') {
        porukeDiv.innerHTML = '<b>Broj Linija Teksta:</b> Unesite ime uloge u tekstualno polje.';
        return;
    }
    const brojLinija = editor.brojLinijaTeksta(ulogaZaAnalizu);

    porukeDiv.innerHTML = `<b>Broj Linija Teksta:</b> Uloga "${ulogaZaAnalizu}" ima ${brojLinija} linija dijaloga.`;
});


document.getElementById("dugmeScenarijUloge").addEventListener('click', () => {
    const inputUloga = document.getElementById("inputUloga"); // Dodano jer je falila definicija
    const ulogaZaAnalizu = inputUloga.value.trim().toUpperCase(); 
    if (ulogaZaAnalizu === '') {
        porukeDiv.innerHTML = '<b>Broj Linija Teksta:</b> Unesite ime uloge u tekstualno polje.';
        return;
    }
    const scenarij = editor.scenarijUloge(ulogaZaAnalizu);

    if (scenarij && scenarij.length > 0) {
        porukeDiv.innerHTML =
            `<b>Scenarij Uloge: ${ulogaZaAnalizu}</b>
             <pre style="white-space: pre-wrap;">${JSON.stringify(scenarij, null, 2)}</pre>`;
    } else {
        porukeDiv.innerHTML =
            `<b>Scenarij Uloge:</b> Uloga "${ulogaZaAnalizu}" nije pronađena ili nema dijaloga.`;
    }
});

document.getElementById("dugmeGrupisiUloge").addEventListener('click', () => {
    editor.grupisiUloge();
    porukeDiv.innerHTML = '<b>Grupiši Uloge:</b> Uloge su grupisane. Provjerite sadržaj editora.';
});

// Povezivanje dugmadi sa Formatiranje metodom
document.getElementById("dugmeBold").addEventListener('click', () => {
    editor.formatirajTekst("bold");
    porukeDiv.innerHTML = '<b>Formatiranje:</b> Tekst je podebljan (Bold).';
});

document.getElementById("dugmeItalic").addEventListener('click', () => {
    editor.formatirajTekst("italic");
    porukeDiv.innerHTML = '<b>Formatiranje:</b> Tekst je iskošen (Italic).';
});

document.getElementById("dugmeUnderline").addEventListener('click', () => {
    editor.formatirajTekst("underline");
    porukeDiv.innerHTML = '<b>Formatiranje:</b> Tekst je podvučen (Underline).';
});



const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get('id');

function prikaziPoruku(tekst) {
    if(porukeDiv) porukeDiv.innerHTML = `<b> ${tekst} </b>`;
    if (tekst) {
        setTimeout(() => {
            porukeDiv.innerHTML = "";
        }, 5000);
    }
}

//upotreba getScenario ajax funkcije
// Definiramo funkciju da je možemo zvati više puta
/*
function ucitajScenario() {
    if (scenarioId) {
        PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
            if (status === 200) {
                // ... (tvoj postojeći kod za naslov) ...

                divEditor.innerHTML = ""; 

                // IZMJENA OVDJE:
                if (data.content && data.content.length > 0) {
                    // Ako ima sadržaja, iscrtaj ga
                    data.content.forEach(linija => {
                        let p = document.createElement("p");
                        p.innerText = linija.text;
                        p.setAttribute("data-id", linija.lineId);
                        divEditor.appendChild(p);
                    });
                } else {
                    // AKO JE SCENARIO PRAZAN (Novi projekt)
                    console.log("Scenario je prazan. Kreiram početnu liniju...");
                    
                    let p = document.createElement("p");
                    p.innerHTML = "&#x200B;"; // Nevidljivi karakter da bi p imao visinu
                    p.setAttribute("data-id", "nova-1"); // Privremeni ID
                    
                    divEditor.appendChild(p);
                    
                    // Automatski aktiviraj tu liniju da korisnik može odmah pisati
                    aktivirajLiniju(p); 
                }
            } else {
                prikaziPoruku("Greška pri učitavanju: " + (data.message || status));
            }
        });
    }
}
*/
// writing.js
function ucitajScenario() {
    if (!scenarioId) return;

    PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
        const titleElement = document.getElementById("naslov-scenarija");
        const sideTitleElement = document.getElementById("sidebarTitle1");

        if (!titleElement) {
            console.error("Element #sidebarTitle1 nije pronađen u HTML-u!");
            return;
        }

        if (status === 200) {
            titleElement.textContent = data.title; 
            sideTitleElement.textContent = data.title; 
        
            divEditor.innerHTML = ""; // Očisti editor

            // Ako imamo linije u bazi (a sada ćemo imati bar jednu)
            if (data.content && data.content.length > 0) {
                data.content.forEach(linija => {
                    let p = document.createElement("p");
                    
                    // BITNO: Ako je tekst prazan, stavi nevidljivi razmak (Zero Width Space)
                    // Bez ovoga ne možeš kliknuti na prazan red!
                    p.innerHTML = (linija.text === "" || linija.text === null) ? "&#x200B;" : linija.text;
                    
                    p.setAttribute("data-id", linija.lineId);
                    divEditor.appendChild(p);
                });
            }
        }else{
            prikaziPoruku("Greska pri ucitavanju.");
            titleElement.textContent = "Greška pri učitavanju";
            sideTitleElement.textContent = "Greška pri učitavanju";
        }
    });
}
/*
function ucitajScenario() {
    if (scenarioId) {
        PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
            if (status === 200) {
                // Postavljanje naslova
                const naslovElement = document.getElementById("naslov-scenarija");
                if (naslovElement && data.title) naslovElement.innerText = data.title;

                divEditor.innerHTML = ""; // Očisti stari tekst

                // Provjera sadržaja koji dolazi iz baze (API sada garantuje barem jednu liniju)
                if (data.content && data.content.length > 0) {
                    data.content.forEach(linija => {
                        let p = document.createElement("p");
                        
                        // Koristimo innerHTML da podržimo formatiranje (bold/italic) i specijalne karaktere
                        // Ako je tekst prazan, stavljamo nevidljivi razmak da kursor može stati u liniju
                        p.innerHTML = (linija.text === "" || linija.text === null) ? "&#x200B;" : linija.text;
                        
                        // Postavljamo tvoj lineId (redni broj)
                        p.setAttribute("data-id", linija.lineId);
                        
                        // Dodajemo i informaciju o nextLineId u dataset (biće null za zadnju liniju)
                        if (linija.nextLineId) {
                            p.setAttribute("data-next", linija.nextLineId);
                        }
                        
                        divEditor.appendChild(p);
                    });

                    // Opcionalno: Ako je scenario tek kreiran (ima samo 1 praznu liniju), 
                    // automatski je aktiviraj da korisnik odmah može pisati
                    if (data.content.length === 1 && data.content[0].text === "") {
                        aktivirajLiniju(divEditor.firstChild);
                    }

                } else {
                    // Ovo se realno ne bi trebalo desiti ako API radi ispravno, 
                    // ali ostavljamo kao sigurnosnu poruku
                    prikaziPoruku("Scenario nema linija teksta.");
                }
            } else {
                prikaziPoruku("Greška pri učitavanju: " + (data.message || status));
            }
        });
    }
}
*/
// poziv funkcije
ucitajScenario();

//upotreba postScenario ajax funkcije
function napraviNovi() {
    const naziv = document.getElementById("noviNaziv").value;
    console.log("OVDJE JE NAPRAVLJEN DOKUMENT NOVINAZIV: ",noviNaziv.value);

    PoziviAjaxFetch.postScenario(naziv, (status, data) => {
        if (status === 200) {
            console.log("Kreiran scenarij:", data);
            window.location.href = `writing.html?id=${data.id}`;
        } else {
            alert("Greška: " + (data.message || status));
        }
    });
}


divEditor.addEventListener('click', function(e) {
    const kliknutaLinija = e.target.closest('[data-id]'); 
    if (!kliknutaLinija || kliknutaLinija.isContentEditable) return;

    const lineId = kliknutaLinija.getAttribute('data-id');

    PoziviAjaxFetch.lockLine(scenarioId, lineId, currentUserId, (status, data) => {
        if (status === 200) {
            // USPJEH
            console.log("Linija zaključana, možeš pisati.");
            resetujSveLinije();
            aktivirajLiniju(kliknutaLinija);
        } else {
            // GREŠKA (npr. status 409 - već zaključano)
            console.error("Greška:", data.message);
            kliknutaLinija.classList.add('error-line');
            prikaziPoruku("Ne mogu urediti: " + (data.message || "Greška na serveru"));
            
            setTimeout(() => kliknutaLinija.classList.remove('error-line'), 1000);
        }
    });
});

divEditor.addEventListener('focusout', function(e) {
    const linija = e.target.closest('[data-id]');
    if (linija && linija.isContentEditable) {
        spasiIOslobodi(linija);
    }
});

divEditor.addEventListener('input', function(e) {
    const linija = e.target.closest('[data-id]');
    if (!linija) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(() => {
        console.log("Istekao interval neaktivnosti. Snimam...");
        spasiIOslobodi(linija);
    }, INTERVAL_CEKANJA);
});

function aktivirajLiniju(element) {
    element.contentEditable = "true";
    element.classList.add('active-line');
    element.focus();
    prikaziPoruku("");
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(() => {
        console.log("Isteklo vrijeme neaktivnosti (bez kucanja). Snimam...");
        spasiIOslobodi(element);
    }, INTERVAL_CEKANJA); 
}

function resetujSveLinije() {
    const aktivne = divEditor.querySelectorAll('.active-line');
    aktivne.forEach(el => {
        el.contentEditable = "false";
        el.classList.remove('active-line');
    });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
}

/*
function spasiIOslobodi(linija) {
    if (linija.dataset.saving === "true") return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    const lineId = linija.getAttribute('data-id');
    const noviTekst = linija.innerHTML;
    
    linija.dataset.saving = "true";
    linija.classList.add('saving-line');


    PoziviAjaxFetch.updateLine(scenarioId, lineId, currentUserId, noviTekst, (status, data) => {
        linija.dataset.saving = "false";
        linija.classList.remove('saving-line');

        if (status === 200) {
            // USPJEH
            linija.contentEditable = "false";
            linija.classList.remove('active-line');
            console.log("Uspješno snimljeno i oslobođeno.");
        } else {
            // GREŠKA
            console.error("Nije uspjelo snimanje:", data);
            linija.classList.add('error-line');
            prikaziPoruku("Greška pri snimanju: " + (data.message || status));
        }
    });
}
*/
function spasiIOslobodi(linija) {
    // 1. Dobavljanje ID-a i validacija
    const rawId = linija.getAttribute('data-id');
    const lineId = parseInt(rawId);

    // IZMJENA: Ako ID nije broj, ne šalji zahtjev (sprečava NaN grešku u SQL-u)
    if (isNaN(lineId)) {
        console.warn("Linija nema validan numerički ID. Update otkazan.");
        return;
    }

    if (linija.dataset.saving === "true") return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    // 2. Čišćenje teksta
    // IZMJENA: Uklanjamo nevidljivi karakter (Zero Width Space) prije slanja u bazu
    // Također koristimo .innerHTML da sačuvamo bold/italic tagove
    let noviTekst = linija.innerHTML.replace(/\u200B/g, '');

    linija.dataset.saving = "true";
    linija.classList.add('saving-line');

    // 3. AJAX poziv
    PoziviAjaxFetch.updateLine(scenarioId, lineId, currentUserId, noviTekst, (status, data) => {
        linija.dataset.saving = "false";
        linija.classList.remove('saving-line');

        if (status === 200) {
            // USPJEH
            linija.contentEditable = "false";
            linija.classList.remove('active-line');
            
            // IZMJENA: Ako je korisnik obrisao sav tekst, vrati nevidljivi space 
            // kako bi linija ostala klikabilna nakon što prestane editovanje
            if (linija.innerHTML === "") {
                linija.innerHTML = "&#x200B;";
            }
            
            console.log("Uspješno snimljeno i oslobođeno.");
        } else {
            // GREŠKA
            console.error("Nije uspjelo snimanje:", data);
            linija.classList.add('error-line');
            prikaziPoruku("Greška pri snimanju: " + (data.message || status));
            
            // Opcionalno: ukloni error klasu nakon par sekundi
            setTimeout(() => linija.classList.remove('error-line'), 2000);
        }
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const step1Div = document.getElementById('step-1-lock');
    const step2Div = document.getElementById('step-2-update');
    
    const inputOldName = document.getElementById('old-char-name');
    const inputNewName = document.getElementById('new-char-name');
    const displayOldName = document.getElementById('display-old-name');
    
    const btnLock = document.getElementById('btn-lock-char');
    const btnUpdate = document.getElementById('btn-update-char');
    const btnCancel = document.getElementById('btn-cancel-char');


    if(btnLock) {
        btnLock.addEventListener('click', () => {
            const oldName = inputOldName.value.trim().toUpperCase();

            if (!oldName) {
                prikaziPoruku("Molim unesite ime uloge!");
                return;
            }
            const postojeceUloge = editor.dajUloge(); 
        
            if (!postojeceUloge.includes(oldName)) {
                prikaziPoruku(`Greška: Uloga "${oldName}" ne postoji u ovom scenariju!`);
                inputOldName.classList.add('error-line'); 
                setTimeout(() => inputOldName.classList.remove('error-line'), 2000);
                return; 
            }
            prikaziPoruku(`Pokušavam zaključati ulogu: ${oldName}...`);


            PoziviAjaxFetch.lockCharacter(scenarioId, oldName, currentUserId, (status, data) => {
                if (status === 200) {
                    // USPJEH
                    prikaziPoruku(`Uloga ${oldName} uspješno zaključana! Unesi novo ime.`);
                    step1Div.style.display = 'none';
                    step2Div.style.display = 'flex';
                    displayOldName.innerText = oldName;
                    inputNewName.focus();
                } else {
                    // GREŠKA
                    prikaziPoruku(`Greška: ${data.message || status}`); 
                    inputOldName.classList.add('error-line'); 
                }
            });
        });
    }

    if(btnUpdate) {
        btnUpdate.addEventListener('click', () => {
            const oldName = displayOldName.innerText; 
            const newName = inputNewName.value.trim().toUpperCase();

            if (!newName) {
                prikaziPoruku("Novo ime ne može biti prazno!");
                return;
            }
            if (oldName === newName) {
                prikaziPoruku("Novo ime mora biti različito od starog!");
                return;
            }

            PoziviAjaxFetch.updateCharacter(scenarioId, currentUserId, oldName, newName, (status, data) => {
                if (status === 200) {
                    // USPJEH
                    prikaziPoruku(`Uspjeh! ${oldName} je sada ${newName}.`);
                    resetujFormuZaLikove();
                    ucitajScenario();
                } else {
                    // GREŠKA
                    prikaziPoruku(`Greška pri izmjeni: ${data.message || status}`);
                }
            });
        });
    }

    if(btnCancel) {
        btnCancel.addEventListener('click', () => {
            prikaziPoruku("Odustali ste od promjene imena.");
            resetujFormuZaLikove();
        });
    }


    const btnGetDeltas = document.getElementById("btn-get-deltas");
    const inputSince = document.getElementById("delta-since-input");

    if (btnGetDeltas && inputSince) {
        
        btnGetDeltas.addEventListener("click", () => {
            const datumVrijeme = inputSince.value; 
            
            if (!datumVrijeme) {
                prikaziPoruku("Molim odaberite datum i vrijeme za provjeru.");
                return;
            }

            const timestamp = Math.floor(new Date(datumVrijeme).getTime() / 1000);
            prikaziPoruku("Provjeravam izmjene...");

            PoziviAjaxFetch.getDeltas(scenarioId, timestamp, (status, data) => {
                // Provjera statusa umjesto err objekta
                if (status !== 200) {
                    console.error(data);
                    prikaziPoruku("Greška prilikom dohvatanja izmjena: " + (data.message || status));
                    return;
                }

                // Ako smo ovdje, status je 200
                if (!data || !data.deltas || data.deltas.length === 0) {
                    prikaziPoruku("Nema izmjena od odabranog vremena.");
                    return;
                }

                let brojOznacenih = 0;

                data.deltas.forEach(delta => {
                    // Slučaj A: Promjena linije
                    if (delta.type === "line_update" && delta.lineId) {
                        const linijaElement = document.querySelector(`p[data-id="${delta.lineId}"]`);
                        if (linijaElement) {
                            linijaElement.classList.add("highlight-change");
                            setTimeout(() => {
                                linijaElement.classList.remove("highlight-change");
                            }, 5000);
                            brojOznacenih++;
                        }
                    }
                    // Slučaj B: Promjena imena lika
                    else if (delta.type === "char_rename") {
                        const sviP = document.querySelectorAll("#divEditor p");
                        sviP.forEach(p => {
                            if (p.innerText.includes(delta.newName)) {
                                p.classList.add("highlight-change");
                                setTimeout(() => p.classList.remove("highlight-change"), 5000);
                            }
                        });
                        brojOznacenih++;
                    }
                });

                prikaziPoruku(`Pronađeno ${data.deltas.length} izmjena. Označeno linija: ${brojOznacenih}`);
            });
        });
    }

    function resetujFormuZaLikove() {
        step1Div.style.display = 'flex';
        step2Div.style.display = 'none';
        inputOldName.value = '';
        inputNewName.value = '';
        displayOldName.innerText = '';
        inputOldName.classList.remove('error-line');
    }
    
});
/*
document.getElementById('dugmeSaveChanges').addEventListener('click', () => {
    // 1. Prikupljamo samo ono što je ostalo
    const imeVal = document.getElementById('ime').value;
    const emailVal = document.getElementById('email').value;
    const sifraVal = document.getElementById('sifra').value;
    const frekvencijaVal = document.getElementById('opcije1').value;

    // 2. Kreiramo userData bez contactMethod-a
    const userData = {
        ime: imeVal,
        email: emailVal,
        sifra: sifraVal,
        frequency: frekvencijaVal
    };

    console.log("Šaljem pročišćene podatke:", userData);

    // 3. Poziv AJAX-a ostaje isti
    PoziviAjaxFetch.registrujKorisnika(userData, (status, data) => {
        if (status === 200 || status === 201) {
            localStorage.setItem('trenutniUserId', data.userId || data.id);
            localStorage.setItem('trenutnoIme', userData.ime);
            window.location.href = 'projects.html';
        } else {
            alert("Greška: " + (data.message || status));
        }
    });
});*/