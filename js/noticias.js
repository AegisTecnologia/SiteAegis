const API_KEY = "AIzaSyCIv2bmzMyLw2GzbkJJ52rN70NLig8fFvo";
const PASTA_ID = "1IA8ywA43Zw5rXWABSpAjKc8f-WEcmWmZ";

fetch(
`https://www.googleapis.com/drive/v3/files?q='${PASTA_ID}'+in+parents&key=${API_KEY}&fields=files(name,id,webViewLink)`
)

.then(res => res.json())

.then(data => {

    console.log(data); // ajuda a descobrir erros

    let area = document.getElementById("lista-drive");

    if (!data.files) {
        area.innerHTML = "Nenhum arquivo encontrado.";
        return;
    }


    data.files.forEach(arquivo => {

        area.innerHTML += `

        <div class="card">

            <h3>${arquivo.name}</h3>

            <a href="${arquivo.webViewLink}" target="_blank">
                Abrir material
            </a>

        </div>

        `;

    });

})

.catch(erro => {
    console.log("Erro ao carregar Drive:", erro);
});