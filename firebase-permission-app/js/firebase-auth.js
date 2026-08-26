import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

// Replace with actual UIDs of site owners
const OWNER_UIDS = [
  'nXA3dDI9J3emisozEjxwwEgVvw33',
  'Cu9C6CYcd7SDigdhWlrIdVPqgWG3'
];

async function isDownloadsAuthorized(user) {
  if (!user) return false;

  try {
    const permissionDoc = await getDoc(
      doc(db, 'permissions', 'downloads')
    );

    if (!permissionDoc.exists()) {
      return false;
    }

    const data = permissionDoc.data();

    return Array.isArray(data.allowedUids) &&
      data.allowedUids.includes(user.uid);
  } catch (err) {
    console.error('Erro ao verificar permissão:', err);
    return false;
  }
}

async function hasPendingRequest(user) {
  try {
    const q = query(collection(db, 'permission_requests'), where('uid', '==', user.uid), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error('Error checking pending requests:', err);
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
    console.error('Error creating permission request:', err);
    return false;
  }
}

function getSiteBasePath() {
  const path = window.location.pathname;
  let base = path.replace(/\/pages\/.*$/, '').replace(/\/[^/]*\.html.*$/, '');
  return base === '' ? '/' : base;
}

function getSiteUrl(relativePath) {
  const base = getSiteBasePath().replace(/\/$/, '');
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

export async function requireDownloadAccess() {
  const user = await getCurrentFirebaseUser();
  if (!user) {
    alert('You need to log in to access the downloads area.');
    window.location.href = getSiteUrl('pages/login.html');
    return false;
  }

  const granted = await isDownloadsAuthorized(user);
  if (!granted) {
    try {
      const pending = await hasPendingRequest(user);
      if (!pending) {
        const created = await createPermissionRequest(user);
        if (created) {
          alert('Access restricted. A permission request has been sent to the owner. Please wait for authorization.');
        } else {
          alert('Access restricted. Unable to send the request. Please try again later.');
        }
      } else {
        alert('Access restricted. You already have a pending request. Please wait for the owner\'s authorization.');
      }
    } catch (err) {
      console.error('Error creating/checking permission request:', err);
      alert('Access restricted. Error processing permission request.');
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
      showMessage(msgEl, 'Passwords do not match.', false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      showMessage(msgEl, 'Registration successful. Redirecting...', true);
      setTimeout(() => { redirectToIndex(); }, 1200);
    } catch (err) {
      showMessage(msgEl, err.message || 'Registration error', false);
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
      showMessage(msgEl, 'Login successful. Redirecting...', true);
      setTimeout(() => { redirectToIndex(); }, 800);
    } catch (err) {
      showMessage(msgEl, err.message || 'Login error', false);
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
        console.error('Error checking download access:', err);
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
      <button id="logout-btn">Logout</button>
    `;
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
  } else {
    authBar.innerHTML = `
      <a href="pages/login.html" class="btn-login">Login</a>
      <a href="pages/cadastro.html" class="btn-cadastro">Register</a>
    `;
  }
});