let div = document.getElementById("divEditor");

let editor = EditorTeksta(div);

const porukeDiv = document.getElementById("poruke");

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
    const ulogaZaAnalizu = inputUloga.value.trim().toUpperCase(); 
    
    if (ulogaZaAnalizu === '') {
        porukeDiv.innerHTML = '<b>Broj Linija Teksta:</b> Unesite ime uloge u tekstualno polje.';
        return;
    }
    const brojLinija = editor.brojLinijaTeksta(ulogaZaAnalizu);

    porukeDiv.innerHTML = `<b>Broj Linija Teksta:</b> Uloga "${ulogaZaAnalizu}" ima ${brojLinija} linija dijaloga.`;
});


document.getElementById("dugmeScenarijUloge").addEventListener('click', () => {
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


/*nije implementirano*/
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