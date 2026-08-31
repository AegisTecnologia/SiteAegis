import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

import { app } from './firebase-config.js';


// =====================================================
// FIREBASE
// =====================================================

const auth = getAuth(app);

// Banco utilizado pelo projeto
const db = getFirestore(
  app,
  'ai-studio-faf5b93d-e8d8-4798-90a4-96f05f6f5855'
);


// =====================================================
// PROPRIETÁRIOS DO SITE
// =====================================================

const OWNER_UIDS = [
  'nXA3dDI9J3emisozEjxwwEgVvw33',
  'Cu9C6CYcd7SDigdhWlrIdVPqgWG3'
];


// =====================================================
// USUÁRIO ATUAL
// =====================================================

async function getCurrentFirebaseUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      }
    );
  });
}


// =====================================================
// CAMINHOS DO SITE
// =====================================================

function getSiteBasePath() {
  const path = window.location.pathname;

  let base = path
    .replace(/\/pages\/.*$/, '')
    .replace(/\/[^/]*\.html.*$/, '');

  return base === '' ? '/' : base;
}


function getSiteUrl(relativePath) {
  const base = getSiteBasePath().replace(/\/$/, '');

  const cleanPath = relativePath.replace(/^\//, '');

  return (
    window.location.origin +
    base +
    '/' +
    cleanPath
  );
}


function redirectToIndex() {
  window.location.href = getSiteUrl('index.html');
}


// =====================================================
// VERIFICAR STATUS DO CADASTRO
// =====================================================

async function getUserApprovalStatus(user) {
  if (!user) {
    return null;
  }

  try {
    const userDoc = await getDoc(
      doc(
        db,
        'users',
        user.uid
      )
    );

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();

    return data.status || 'pending';

  } catch (err) {

    console.error(
      'Erro ao verificar status do usuário:',
      err
    );

    return null;
  }
}


// =====================================================
// VERIFICAR APROVAÇÃO
// =====================================================

async function isUserApproved(user) {
  if (!user) {
    return false;
  }

  // Os proprietários sempre têm acesso
  if (OWNER_UIDS.includes(user.uid)) {
    return true;
  }

  const status = await getUserApprovalStatus(user);

  return status === 'approved';
}


// =====================================================
// VERIFICAR PERMISSÕES DE DOWNLOAD
// =====================================================

async function isDownloadsAuthorized(user) {
  if (!user) {
    return false;
  }

  // Proprietários sempre podem baixar
  if (OWNER_UIDS.includes(user.uid)) {
    return true;
  }

  try {

    const permissionDoc =
      await getDoc(
        doc(
          db,
          'permissions',
          'downloads'
        )
      );

    if (!permissionDoc.exists()) {
      return false;
    }

    const data =
      permissionDoc.data();

    return (
      Array.isArray(data.allowedUids) &&
      data.allowedUids.includes(user.uid)
    );

  } catch (err) {

    console.error(
      'Erro ao verificar permissão de downloads:',
      err
    );

    return false;
  }
}


// =====================================================
// VERIFICAR SOLICITAÇÃO PENDENTE
// =====================================================

async function hasPendingRequest(user) {
  if (!user) {
    return false;
  }

  try {

    const q =
      query(
        collection(
          db,
          'permission_requests'
        ),
        where(
          'uid',
          '==',
          user.uid
        ),
        where(
          'status',
          '==',
          'pending'
        )
      );

    const snap =
      await getDocs(q);

    return !snap.empty;

  } catch (err) {

    console.error(
      'Erro ao checar solicitações pendentes:',
      err
    );

    return false;
  }
}


// =====================================================
// CRIAR SOLICITAÇÃO DE CADASTRO
// =====================================================

async function createRegistrationRequest(user) {

  try {

    const request = {

      uid:
        user.uid,

      email:
        user.email || null,

      displayName:
        user.displayName || null,

      type:
        'registration',

      status:
        'pending',

      createdAt:
        serverTimestamp()
    };


    await addDoc(
      collection(
        db,
        'permission_requests'
      ),
      request
    );


    console.log(
      'Solicitação de cadastro criada.'
    );

    return true;

  } catch (err) {

    console.error(
      'Erro ao criar solicitação de cadastro:',
      err
    );

    return false;
  }
}


// =====================================================
// CRIAR USUÁRIO NO FIRESTORE
// =====================================================

async function createUserDocument(user, name, email) {

  await setDoc(
    doc(
      db,
      'users',
      user.uid
    ),
    {

      uid:
        user.uid,

      email:
        email,

      displayName:
        name || null,

      status:
        'pending',

      createdAt:
        serverTimestamp()
    }
  );

  console.log(
    'Usuário criado no Firestore com status pending.'
  );
}


// =====================================================
// PROTEGER DOWNLOADS
// =====================================================

export async function requireDownloadAccess() {

  const user =
    await getCurrentFirebaseUser();


  if (!user) {

    alert(
      'Faça login para solicitar acesso aos downloads.'
    );

    window.location.href =
      getSiteUrl(
        'pages/login.html'
      );

    return false;
  }


  // Primeiro verifica se o cadastro foi aprovado
  const approved =
    await isUserApproved(user);


  if (!approved) {

    const status =
      await getUserApprovalStatus(user);


    if (status === 'pending') {

      alert(
        'Seu cadastro ainda está aguardando aprovação do administrador.'
      );

    } else if (status === 'rejected') {

      alert(
        'Seu cadastro foi rejeitado pelo administrador.'
      );

    } else {

      alert(
        'Seu cadastro ainda não foi aprovado.'
      );
    }

    return false;
  }


  // Depois verifica permissão específica de downloads
  const authorized =
    await isDownloadsAuthorized(user);


  if (authorized) {
    return true;
  }


  const pending =
    await hasPendingRequest(user);


  if (!pending) {
    await createPermissionRequest(user);
  }


  alert(
    'Você ainda não tem permissão para baixar arquivos. Sua solicitação foi enviada ao administrador.'
  );


  window.location.href =
    getSiteUrl('index.html');


  return false;
}


// =====================================================
// MENSAGENS DOS FORMULÁRIOS
// =====================================================

function createMessageElement(form) {

  let msgEl =
    form.querySelector(
      '#form-message'
    );


  if (!msgEl) {

    msgEl =
      document.createElement(
        'div'
      );

    msgEl.className =
      'message';

    msgEl.id =
      'form-message';

    msgEl.setAttribute(
      'aria-live',
      'polite'
    );

    form.insertBefore(
      msgEl,
      form.firstChild
    );
  }


  return msgEl;
}


function showMessage(
  el,
  msg,
  success = true
) {

  if (!el) {
    return;
  }


  el.textContent =
    msg;


  el.style.color =
    success
      ? 'green'
      : 'red';
}


// =====================================================
// CADASTRO
// =====================================================

const signupForm =
  document.getElementById(
    'signup-form'
  );


if (signupForm) {

  signupForm.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      const name =
        document
          .getElementById(
            'signup-name'
          )
          .value
          .trim();


      const email =
        document
          .getElementById(
            'signup-email'
          )
          .value
          .trim()
          .toLowerCase();


      const password =
        document
          .getElementById(
            'signup-password'
          )
          .value;


      const confirm =
        document
          .getElementById(
            'signup-password-confirm'
          )
          .value;


      const msgEl =
        createMessageElement(
          signupForm
        );


      // ---------------------------------------------
      // CONFIRMAR SENHAS
      // ---------------------------------------------

      if (password !== confirm) {

        showMessage(
          msgEl,
          'As senhas não conferem.',
          false
        );

        return;
      }


      // ---------------------------------------------
      // SENHA MÍNIMA
      // ---------------------------------------------

      if (password.length < 6) {

        showMessage(
          msgEl,
          'A senha precisa ter pelo menos 6 caracteres.',
          false
        );

        return;
      }


      try {

        // -------------------------------------------
        // CRIAR CONTA
        // -------------------------------------------

        console.log(
          'Criando usuário no Firebase Authentication...'
        );


        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );


        const user =
          userCredential.user;


        console.log(
          'Usuário criado:',
          user.uid
        );


        // -------------------------------------------
        // ATUALIZAR NOME
        // -------------------------------------------

        if (name) {

          await updateProfile(
            user,
            {
              displayName:
                name
            }
          );
        }


        // -------------------------------------------
        // SALVAR USUÁRIO
        // -------------------------------------------

        console.log(
          'Salvando usuário no Firestore...'
        );


        await createUserDocument(
          user,
          name,
          email
        );


        // -------------------------------------------
        // CRIAR SOLICITAÇÃO
        // -------------------------------------------

        await createRegistrationRequest(
          user
        );


        // -------------------------------------------
        // SUCESSO
        // -------------------------------------------

        showMessage(
          msgEl,
          'Cadastro realizado! Sua conta está aguardando aprovação do administrador.',
          true
        );


        console.log(
          'Cadastro aguardando aprovação.'
        );


        // Desloga imediatamente.
        // O usuário só poderá entrar depois da aprovação.
        await signOut(auth);


        setTimeout(
          () => {

            window.location.href =
              getSiteUrl(
                'pages/login.html'
              );

          },
          1800
        );


      } catch (err) {

        console.error(
          'ERRO COMPLETO NO CADASTRO:',
          err
        );


        let mensagem =
          'Não foi possível realizar o cadastro.';


        if (
          err.code ===
          'permission-denied'
        ) {

          mensagem =
            'O Firestore recusou o acesso. Verifique as Rules e o banco utilizado.';

        } else if (
          err.code ===
          'auth/email-already-in-use'
        ) {

          mensagem =
            'Este e-mail já possui uma conta.';

        } else if (
          err.code ===
          'auth/invalid-email'
        ) {

          mensagem =
            'O e-mail informado é inválido.';

        } else if (
          err.code ===
          'auth/weak-password'
        ) {

          mensagem =
            'A senha precisa ter pelo menos 6 caracteres.';

        } else if (
          err.code ===
          'auth/network-request-failed'
        ) {

          mensagem =
            'Erro de conexão. Verifique sua internet e tente novamente.';

        } else if (err.message) {

          mensagem =
            err.message;
        }


        showMessage(
          msgEl,
          mensagem,
          false
        );
      }

    }
  );
}


// =====================================================
// LOGIN
// =====================================================

const loginForm =
  document.getElementById(
    'login-form'
  );


if (loginForm) {

  loginForm.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      const email =
        document
          .getElementById(
            'login-email'
          )
          .value
          .trim()
          .toLowerCase();


      const password =
        document
          .getElementById(
            'login-password'
          )
          .value;


      const msgEl =
        createMessageElement(
          loginForm
        );


      try {

        console.log(
          'Tentando fazer login:',
          email
        );


        const credential =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );


        const user =
          credential.user;


        console.log(
          'Login realizado:',
          user.uid
        );


        // -------------------------------------------
        // VERIFICAR APROVAÇÃO
        // -------------------------------------------

        const status =
          await getUserApprovalStatus(
            user
          );


        console.log(
          'Status do cadastro:',
          status
        );


        // Proprietários não precisam de aprovação
        if (
          OWNER_UIDS.includes(
            user.uid
          )
        ) {

          showMessage(
            msgEl,
            'Login efetuado. Redirecionando...',
            true
          );

          setTimeout(
            () => {
              redirectToIndex();
            },
            800
          );

          return;
        }


        // -------------------------------------------
        // PENDENTE
        // -------------------------------------------

        if (
          status ===
          'pending'
        ) {

          await signOut(
            auth
          );


          showMessage(
            msgEl,
            'Seu cadastro está aguardando aprovação do administrador.',
            false
          );

          return;
        }


        // -------------------------------------------
        // REJEITADO
        // -------------------------------------------

        if (
          status ===
          'rejected'
        ) {

          await signOut(
            auth
          );


          showMessage(
            msgEl,
            'Seu cadastro foi rejeitado pelo administrador.',
            false
          );

          return;
        }


        // -------------------------------------------
        // NÃO ENCONTRADO
        // -------------------------------------------

        if (
          status ===
          null
        ) {

          await signOut(
            auth
          );


          showMessage(
            msgEl,
            'Não foi possível encontrar o cadastro deste usuário no sistema.',
            false
          );

          return;
        }


        // -------------------------------------------
        // APROVADO
        // -------------------------------------------

        if (
          status ===
          'approved'
        ) {

          showMessage(
            msgEl,
            'Login efetuado. Redirecionando...',
            true
          );


          setTimeout(
            () => {
              redirectToIndex();
            },
            800
          );

          return;
        }


        // -------------------------------------------
        // STATUS DESCONHECIDO
        // -------------------------------------------

        await signOut(
          auth
        );


        showMessage(
          msgEl,
          'Seu cadastro ainda não está liberado.',
          false
        );


      } catch (err) {

        console.error(
          'Erro no login:',
          err
        );


        let mensagem =
          'Erro no login.';


        if (
          err.code ===
          'auth/invalid-credential'
        ) {

          mensagem =
            'E-mail ou senha incorretos.';

        } else if (
          err.code ===
          'auth/user-not-found'
        ) {

          mensagem =
            'Usuário não encontrado.';

        } else if (
          err.code ===
          'auth/wrong-password'
        ) {

          mensagem =
            'Senha incorreta.';

        } else if (
          err.code ===
          'auth/invalid-email'
        ) {

          mensagem =
            'O e-mail informado é inválido.';

        } else if (err.message) {

          mensagem =
            err.message;
        }


        showMessage(
          msgEl,
          mensagem,
          false
        );
      }

    }
  );
}


// =====================================================
// PROTEGER LINK DE DOWNLOADS
// =====================================================

function protectDownloadsLink() {

  const selector =
    'a[href$="downloads.html"], a[href*="/downloads.html"]';


  const links =
    Array.from(
      document.querySelectorAll(
        selector
      )
    );


  if (!links.length) {
    return;
  }


  links.forEach(
    (link) => {

      link.addEventListener(
        'click',
        async (e) => {

          if (
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey ||
            e.button !== 0
          ) {
            return;
          }


          e.preventDefault();


          try {

            const allowed =
              await requireDownloadAccess();


            if (!allowed) {
              return;
            }


            const href =
              link.getAttribute(
                'href'
              ) || '';


            if (
              /^(https?:)?\/\//.test(
                href
              ) ||
              href.startsWith('/')
            ) {

              const target =
                href.startsWith('http')
                  ? href
                  : window.location.origin +
                    href;


              window.location.href =
                target;

            } else {

              window.location.href =
                getSiteUrl(
                  href
                );
            }


          } catch (err) {

            console.error(
              'Erro ao verificar acesso a downloads:',
              err
            );
          }

        }
      );

    }
  );
}


protectDownloadsLink();


// =====================================================
// BARRA DE AUTENTICAÇÃO
// =====================================================

const authBar =
  document.getElementById(
    'auth-bar'
  );


let currentUser =
  null;


onAuthStateChanged(
  auth,
  async (user) => {

    currentUser =
      user;


    if (!authBar) {
      return;
    }


    // -----------------------------------------------
    // LOGADO
    // -----------------------------------------------

    if (user) {

      const status =
        await getUserApprovalStatus(
          user
        );


      // Se não for proprietário e não estiver aprovado,
      // não deve permanecer logado.
      if (
        !OWNER_UIDS.includes(
          user.uid
        ) &&
        status !== 'approved'
      ) {

        console.log(
          'Usuário sem aprovação:',
          user.email,
          status
        );


        await signOut(
          auth
        );


        authBar.innerHTML = `

          <a
            href="pages/login.html"
            class="btn-login"
          >
            Login
          </a>

          <a
            href="pages/cadastro.html"
            class="btn-cadastro"
          >
            Cadastro
          </a>

        `;


        return;
      }


      authBar.innerHTML = `

        <span class="auth-user">
          ${user.displayName || user.email}
        </span>

        ${
          OWNER_UIDS.includes(user.uid)
            ? `
              <a
                href="pages/admin-requests.html"
                class="btn-admin"
              >
                Admin
              </a>
            `
            : ''
        }

        <button
          id="logout-btn"
          type="button"
        >
          Sair
        </button>

      `;


      const logoutBtn =
        document.getElementById(
          'logout-btn'
        );


      if (logoutBtn) {

        logoutBtn.addEventListener(
          'click',
          async () => {

            try {

              await signOut(
                auth
              );

            } catch (err) {

              console.error(
                'Erro ao sair:',
                err
              );
            }

          }
        );
      }


    // -----------------------------------------------
    // NÃO LOGADO
    // -----------------------------------------------

    } else {

      authBar.innerHTML = `

        <a
          href="pages/login.html"
          class="btn-login"
        >
          Login
        </a>

        <a
          href="pages/cadastro.html"
          class="btn-cadastro"
        >
          Cadastro
        </a>

      `;
    }

  }
);