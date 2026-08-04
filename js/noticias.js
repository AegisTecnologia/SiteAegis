const listaNoticias = document.getElementById("listaNoticias");


fetch("../noticias.json")
.then(resposta => resposta.json())
.then(noticias => {


    noticias.forEach(noticia => {


        listaNoticias.innerHTML += `

        <div class="card">

            <h2>
                ${noticia.titulo}
            </h2>

            <p>
                ${noticia.conteudo}
            </p>

            <span>
                ${new Date(noticia.data).toLocaleDateString("pt-BR")}
            </span>

        </div>

        `;


    });


})
.catch(erro => {

    console.error(
        "Erro carregando notícias:",
        erro
    );

});