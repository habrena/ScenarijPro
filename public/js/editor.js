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
function ucitajScenario() {
    if (scenarioId) {
        console.log("Tražim scenarij broj:", scenarioId);
        
        PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
            if (status === 200) {
                console.log("Stigli podaci:", data);

                const naslovElement = document.getElementById("naslov-scenarija");
                const sidebarElement1 = document.getElementById("sidebarTitle1");
                
                if (naslovElement && data.title) {
                    naslovElement.innerText = data.title; 
                }
                if (sidebarElement1 && data.title) {
                    sidebarElement1.innerText = data.title; 
                }
                
                divEditor.innerHTML = ""; // Očisti stari tekst
                
                if (data.content) {
                    data.content.forEach(linija => {
                        let p = document.createElement("p");
                        p.innerText = linija.text;
                        p.setAttribute("data-id", linija.lineId);
                        divEditor.appendChild(p);
                    });
                } 
            } else {
                prikaziPoruku("Greška pri učitavanju: " + (data.message || status));
            }
        });
    } else {
        prikaziPoruku("Nije odabran scenarij.");
    }
}

// poziv funkcije
ucitajScenario();

//upotreba postScenario ajax funkcije
function napraviNovi() {
    const naziv = document.getElementById("noviNaziv").value;

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