import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

// Substitua pelos UIDs reais dos proprietários do site
const OWNER_UIDS = [
  'nXA3dDI9J3emisozEjxwwEgVvw33',
  'Cu9C6CYcd7SDigdhWlrIdVPqgWG3'
];
// ...existing code...

export async function requireDownloadAccess() {
  const user = await getCurrentFirebaseUser();

  if (!user) {
    alert('Faça login para solicitar acesso aos downloads.');
    window.location.href = getSiteUrl('pages/login.html');
    return false;
  }

  const authorized = await isDownloadsAuthorized(user);

  if (authorized) {
    return true;
  }

  const pending = await hasPendingRequest(user);

  if (!pending) {
    await createPermissionRequest(user);
  }

  alert('Você ainda não tem permissão. Solicitação enviada ao administrador.');
  window.location.href = getSiteUrl('index.html');
  return false;
}

// ...existing code...
async function isDownloadsAuthorized(user) {
  if (!user) return false;
  try {
    const permissionDoc = await getDoc(doc(db, 'permissions', 'downloads'));
    if (!permissionDoc.exists()) return false;
    const data = permissionDoc.data();
    return Array.isArray(data.allowedUids) && data.allowedUids.includes(user.uid);
  } catch (err) {
    console.error('Erro ao verificar permissão de downloads:', err);
    return false;
  }
}

async function hasPendingRequest(user) {
  try {
    const q = query(collection(db, 'permission_requests'), where('uid', '==', user.uid), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error('Erro ao checar solicitações pendentes:', err);
    return false;
  }
}

async function createPermissionRequest(user) {
  try {
    const req = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      status: 'pending',
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'permission_requests'), req);
    return true;
  } catch (err) {
    console.error('Erro ao criar solicitação de permissão:', err);
    return false;
  }
}

function getSiteBasePath() {
  const path = window.location.pathname;
  // Remove anything after /pages/ or anything after the last .html file
  let base = path.replace(/\/pages\/.*$/, '').replace(/\/[^/]*\.html.*$/, '');
  return base === '' ? '/' : base;
}

function getSiteUrl(relativePath) {
  const base = getSiteBasePath().replace(/\/$/, '');
  // Ensure relativePath doesn't start with /
  const cleanPath = relativePath.replace(/^\//, '');
  return window.location.origin + base + '/' + cleanPath;
}

async function getCurrentFirebaseUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
  const granted = await isDownloadsAuthorized(user);
  if (!granted) {
    // If not authorized, create a permission request in Firestore (if none pending)
    try {
      const pending = await hasPendingRequest(user);
      if (!pending) {
        const created = await createPermissionRequest(user);
        if (created) {
          alert('Acesso restrito. Uma solicitação de permissão foi enviada ao proprietário. Aguarde autorização.');
        } else {
          alert('Acesso restrito. Não foi possível enviar a solicitação. Tente novamente mais tarde.');
        }
      } else {
        alert('Acesso restrito. Você já possui uma solicitação pendente. Aguarde autorização do proprietário.');
      }
    } catch (err) {
      console.error('Erro ao criar/verificar solicitação de permissão:', err);
      alert('Acesso restrito. Erro ao processar solicitação de permissão.');
    }
    window.location.href = getSiteUrl('index.html');
    return false;
  }

  return true;
}

function createMessageElement(form) {
  let msgEl = form.querySelector('#form-message');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.className = 'message';
    msgEl.id = 'form-message';
    msgEl.setAttribute('aria-live', 'polite');
    form.insertBefore(msgEl, form.firstChild);
  }
  return msgEl;
}

function showMessage(el, msg, success = true) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = success ? 'green' : 'red';
}

function redirectToIndex() {
  window.location.href = getSiteUrl('index.html');
}

// Signup
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-password-confirm').value;
    const msgEl = createMessageElement(signupForm);

    if (password !== confirm) {
      showMessage(msgEl, 'As senhas não conferem.', false);
      return;
    }
// ...existing code...

const emailKey = email.toLowerCase().trim();

const approvalDoc = await getDoc(
  doc(db, 'preapproved_users', emailKey)
);

if (!approvalDoc.exists() || approvalDoc.data().status !== 'approved') {
  showMessage(
    messageEl,
    'Seu cadastro ainda não foi aprovado por um administrador.',
    false
  );
  return;
}

// ...existing code...
const userCredential = await createUserWithEmailAndPassword(
  auth,
  email,
  password
);

await updateProfile(userCredential.user, {
  displayName: name
});

await setDoc(doc(db, 'users', userCredential.user.uid), {
  uid: userCredential.user.uid,
  email: emailKey,
  displayName: name,
  createdAt: serverTimestamp()
});

// ...existing code...
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      showMessage(msgEl, 'Cadastro realizado com sucesso. Redirecionando...', true);
      setTimeout(() => { redirectToIndex(); }, 1200);
    } catch (err) {
      showMessage(msgEl, err.message || 'Erro no cadastro', false);
    }
  });
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const msgEl = createMessageElement(loginForm);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage(msgEl, 'Login efetuado. Redirecionando...', true);
      setTimeout(() => { redirectToIndex(); }, 800);
    } catch (err) {
      showMessage(msgEl, err.message || 'Erro no login', false);
    }
  });
}

// Auth state observer to update header
const authBar = document.getElementById('auth-bar');
let currentUser = null;

function protectDownloadsLink() {
  const selector = 'a[href$="downloads.html"], a[href*="/downloads.html"]';
  const links = Array.from(document.querySelectorAll(selector));
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener('click', async (e) => {
      // allow opening in new tab/window
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      try {
        const allowed = await requireDownloadAccess();
        if (allowed) {
          const href = link.getAttribute('href') || '';
          if (/^(https?:)?\/\//.test(href) || href.startsWith('/')) {
            const target = href.startsWith('http') ? href : window.location.origin + href;
            window.location.href = target;
          } else {
            window.location.href = getSiteUrl(href);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar acesso a downloads:', err);
      }
    });
  });
}

protectDownloadsLink();

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!authBar) return;
  if (user) {
    authBar.innerHTML = `
      <span class="auth-user">${user.displayName || user.email}</span>
      ${OWNER_UIDS.includes(user.uid) ? '<a href="pages/admin-requests.html" class="btn-admin">Admin</a>' : ''}
      <button id="logout-btn">Sair</button>
    `;
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
  } else {
    authBar.innerHTML = `
      <a href="pages/login.html" class="btn-login">Login</a>
      <a href="pages/cadastro.html" class="btn-cadastro">Cadastro</a>
    `;
  }
});
