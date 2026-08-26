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
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

const OWNER_UIDS = [
  'nXA3dDI9J3emisozEjxwwEgVvw33',
  'Cu9C6CYcd7SDigdhWlrIdVPqgWG3'
];

function getSiteBasePath() {
  const path = window.location.pathname;
  return path.replace(/\/pages\/.*$/, '').replace(/\/[^/]+\.html$/, '') || '';
}

function getSiteUrl(relativePath) {
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `${window.location.origin}${getSiteBasePath()}/${cleanPath}`;
}

function getCurrentFirebaseUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function isDownloadsAuthorized(user) {
  if (!user) return false;

  const permission = await getDoc(doc(db, 'permissions', 'downloads'));

  if (!permission.exists()) return false;

  const allowedUids = permission.data().allowedUids || [];
  return allowedUids.includes(user.uid);
}

async function hasPendingRequest(user) {
  const requestQuery = query(
    collection(db, 'permission_requests'),
    where('uid', '==', user.uid),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(requestQuery);
  return !snapshot.empty;
}

async function createPermissionRequest(user) {
  await addDoc(collection(db, 'permission_requests'), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || '',
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

export async function requireDownloadAccess() {
  const user = await getCurrentFirebaseUser();

  if (!user) {
    window.location.href = getSiteUrl('pages/login.html');
    return false;
  }

  if (await isDownloadsAuthorized(user)) {
    return true;
  }

  if (!(await hasPendingRequest(user))) {
    await createPermissionRequest(user);
  }

  alert('Acesso aos downloads ainda não aprovado.');
  window.location.href = getSiteUrl('index.html');
  return false;
}

function showMessage(form, message, success = false) {
  let element = form.querySelector('.form-message');

  if (!element) {
    element = document.createElement('p');
    element.className = 'form-message';
    form.prepend(element);
  }

  element.textContent = message;
  element.style.color = success ? 'green' : 'red';
}

const signupForm = document.getElementById('signup-form');

if (signupForm) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('signup-name')?.value.trim() || '';
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;
    const confirmation = document.getElementById('signup-password-confirm').value;

    if (password !== confirmation) {
      showMessage(signupForm, 'As senhas não conferem.');
      return;
    }

    try {
      const approval = await getDoc(doc(db, 'preapproved_users', email));

      if (!approval.exists() || approval.data().status !== 'approved') {
        showMessage(
          signupForm,
          'Seu e-mail ainda não foi aprovado pelo administrador.'
        );
        return;
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (name) {
        await updateProfile(credential.user, {
          displayName: name
        });
      }

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email,
        displayName: name,
        createdAt: serverTimestamp()
      });

      showMessage(signupForm, 'Cadastro realizado com sucesso.', true);

      setTimeout(() => {
        window.location.href = getSiteUrl('index.html');
      }, 800);
    } catch (error) {
      console.error(error);
      showMessage(signupForm, 'Erro ao realizar cadastro.');
    }
  });
}

const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      window.location.href = getSiteUrl('index.html');
    } catch (error) {
      console.error(error);
      showMessage(loginForm, 'E-mail ou senha inválidos.');
    }
  });
}

const authBar = document.getElementById('auth-bar');

onAuthStateChanged(auth, (user) => {
  if (!authBar) return;

  if (user) {
    authBar.innerHTML = `
      <span>${user.displayName || user.email}</span>
      ${
        OWNER_UIDS.includes(user.uid)
          ? '<a href="pages/admin-requests.html">Admin</a>'
          : ''
      }
      <button id="logout-btn" type="button">Sair</button>
    `;

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await signOut(auth);
      window.location.reload();
    });
  } else {
    authBar.innerHTML = `
      <a href="pages/login.html">Login</a>
      <a href="pages/cadastro.html">Cadastro</a>
    `;
  }
});