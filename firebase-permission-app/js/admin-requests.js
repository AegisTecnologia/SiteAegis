import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { app } from './firebase-config.js';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const auth = getAuth(app);
const db = getFirestore(app);

async function fetchAccessRequests() {
  const requestsCollection = collection(db, 'permission_requests');
  const snapshot = await getDocs(requestsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function approveRequest(requestId) {
  const requestDoc = doc(db, 'permission_requests', requestId);
  await updateDoc(requestDoc, { status: 'approved' });
}
// ...existing code...

await setDoc(
  doc(db, 'preapproved_users', request.email.toLowerCase().trim()),
  {
    email: request.email.toLowerCase().trim(),
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: user.uid
  }
);

// ...existing code...
async function rejectRequest(requestId) {
  const requestDoc = doc(db, 'permission_requests', requestId);
  await updateDoc(requestDoc, { status: 'rejected' });
}

function renderRequests(requests) {
  const requestsContainer = document.getElementById('requests-container');
  requestsContainer.innerHTML = '';

  requests.forEach(request => {
    const requestElement = document.createElement('div');
    requestElement.className = 'request';
    requestElement.innerHTML = `
      <p>User: ${request.displayName || request.email}</p>
      <p>Status: ${request.status}</p>
      <button class="approve-btn" data-id="${request.id}">Approve</button>
      <button class="reject-btn" data-id="${request.id}">Reject</button>
    `;
    requestsContainer.appendChild(requestElement);
  });

  document.querySelectorAll('.approve-btn').forEach(button => {
    button.addEventListener('click', async () => {
      await approveRequest(button.dataset.id);
      loadRequests();
    });
  });

  document.querySelectorAll('.reject-btn').forEach(button => {
    button.addEventListener('click', async () => {
      await rejectRequest(button.dataset.id);
      loadRequests();
    });
  });
}

async function loadRequests() {
  const requests = await fetchAccessRequests();
  renderRequests(requests);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadRequests();
  } else {
    window.location.href = 'login.html';
  }
});