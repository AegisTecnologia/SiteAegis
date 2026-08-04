console.log("NOVO NOTICIAS JS CARREGADO");

fetch("https://isabellamahfud.github.io/aegisTecnologia/noticias.json")
.then(response => response.json())
.then(data => {

    console.log("NOTÍCIAS:", data);

    const lista = document.getElementById("listaNoticias");

    data.forEach(noticia => {

        lista.innerHTML += `
        
        <div class="card">

            <h2>${noticia.titulo}</h2>

            <p>${noticia.conteudo}</p>

            <small>
                ${new Date(noticia.data).toLocaleDateString("pt-BR")}
            </small>

        </div>

        `;

    });

})
.catch(error => {

    console.error("Erro carregando notícias:", error);

});