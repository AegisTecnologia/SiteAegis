const API_KEY = "AIzaSyBIAx2hqE0y0OGLVmgg3mFVyh-4wMD25Gw";
const PASTA_ID = "1IA8ywA43Zw5rXWABSpAjKc8f-WEcmWmZ";
const arquivoJSON = "noticias.json";


fetch(arquivoJSON)

.then(res => res.json())

.then(noticias => {

const area = document.getElementById("cards-noticias");


noticias.forEach(noticia => {


area.innerHTML += `

<div class="card-noticia">

<img src="${noticia.imagem}">


<div class="conteudo-card">

<h3>
${noticia.titulo}
</h3>


<p>
${noticia.texto}
</p>


<span>
${noticia.data}
</span>


</div>

</div>


`;


});


});
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

fetch("arquivo-do-drive")
.then(res => res.json())
.then(noticias => {

const area =
document.getElementById("listaNoticias");


noticias.forEach(noticia => {


area.innerHTML += `

<div class="card-noticia">


<img src="${noticia.imagem}">


<h3>
${noticia.titulo}
</h3>


<p>
${noticia.texto}
</p>


<span>
${noticia.data}
</span>


</div>


`;


});


});