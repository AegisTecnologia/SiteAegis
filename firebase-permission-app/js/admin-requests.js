import {
  getAuth,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
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

const requestsContainer = document.getElementById('requests');

async function fetchAccessRequests() {
  const snapshot = await getDocs(collection(db, 'permission_requests'));

  return snapshot.docs
    .map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data()
    }))
    .filter((request) => request.status === 'pending');
}

async function approveRequest(request) {
  if (!request.email) {
    throw new Error('A solicitação não possui e-mail.');
  }

  const email = request.email.toLowerCase().trim();

  // Autoriza o e-mail para realizar o cadastro
  await setDoc(doc(db, 'preapproved_users', email), {
    email,
    status: 'approved',
    approvedAt: serverTimestamp()
  });

  // Se o usuário já tiver UID, libera também os downloads
  if (request.uid) {
    await setDoc(
      doc(db, 'permissions', 'downloads'),
      { allowedUids: arrayUnion(request.uid) },
      { merge: true }
    );
  }

  await updateDoc(doc(db, 'permission_requests', request.id), {
    status: 'approved',
    approvedAt: serverTimestamp()
  });
}

async function rejectRequest(request) {
  await updateDoc(doc(db, 'permission_requests', request.id), {
    status: 'rejected',
    rejectedAt: serverTimestamp()
  });
}

function renderRequests(requests) {
  if (!requestsContainer) return;

  requestsContainer.innerHTML = '';

  if (requests.length === 0) {
    requestsContainer.innerHTML = '<li>Nenhuma solicitação pendente.</li>';
    return;
  }

  requests.forEach((request) => {
    const item = document.createElement('li');

    const title = document.createElement('p');
    title.textContent =
      `${request.displayName || 'Usuário'} — ${request.email || 'Sem e-mail'}`;

    const approveButton = document.createElement('button');
    approveButton.textContent = 'Aprovar';
    approveButton.type = 'button';

    const rejectButton = document.createElement('button');
    rejectButton.textContent = 'Recusar';
    rejectButton.type = 'button';

    approveButton.addEventListener('click', async () => {
      try {
        approveButton.disabled = true;
        await approveRequest(request);
        alert('Usuário aprovado.');
        await loadRequests();
      } catch (error) {
        console.error(error);
        alert('Erro ao aprovar usuário. Verifique as regras do Firestore.');
        approveButton.disabled = false;
      }
    });

    rejectButton.addEventListener('click', async () => {
      try {
        rejectButton.disabled = true;
        await rejectRequest(request);
        alert('Solicitação recusada.');
        await loadRequests();
      } catch (error) {
        console.error(error);
        alert('Erro ao recusar solicitação.');
        rejectButton.disabled = false;
      }
    });

    item.append(title, approveButton, rejectButton);
    requestsContainer.appendChild(item);
  });
}

async function loadRequests() {
  try {
    requestsContainer.innerHTML = '<li>Carregando...</li>';
    const requests = await fetchAccessRequests();
    renderRequests(requests);
  } catch (error) {
    console.error('Erro ao carregar solicitações:', error);
    requestsContainer.innerHTML =
      '<li>Não foi possível carregar as solicitações.</li>';
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user || !OWNER_UIDS.includes(user.uid)) {
    alert('Acesso permitido somente para administradores.');
    window.location.href = '../index.html';
    return;
  }

  await loadRequests();
});