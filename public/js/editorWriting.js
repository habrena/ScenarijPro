/*function ucitajSveScenarije(userId) {
    const mreza = document.getElementById('mreza');
    const addCard = document.getElementById('card-new');

    // Brišemo sve stare kartice osim one za dodavanje novog
    const trenutneKartice = mreza.querySelectorAll('.kartica:not(.add-card)');
    trenutneKartice.forEach(k => k.remove());

    fetch(`/api/users/${userId}/scenarios`)
        .then(res => res.json())
        .then(scenariji => {
            if (scenariji.length === 0) {
                console.log("Korisnik nema scenarija.");
                return;
            }

            // Za svaki scenario kreiramo karticu
            scenariji.forEach(s => {
                dodajKarticuNaEkran(s);
            });
        })
        .catch(err => console.error("Greška pri dohvatanju:", err));


function ucitajScenarioTitle() {
    if (!scenarioId) return;

    PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
        if (status === 200) {
            document.getElementById("sidebarTitle1")=data.title;
            
        }else{
            document.getElementById("sidebarTitle1")="Ucitavanje";
        }
    });
}
ucitajScenarioTitle();
*/