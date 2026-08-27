import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyC4xWHLntD3337DqGeIpS8BWXfFMXEiqCU",
  authDomain: "aegistecnologia-3c880.firebaseapp.com",
  projectId: "aegistecnologia-3c880",
  storageBucket: "aegistecnologia-3c880.appspot.com",
  messagingSenderId: "269496190895",
  appId: "1:269496190895:web:0ae5c45739c23fb71bd15a"
};

export const app = initializeApp(firebaseConfig);

// Conecta especificamente ao banco que você está usando
export const db = getFirestore(
  app,
  'ai-studio-faf5b93d-e8d8-4798-90a4-96f05f6f5855'
);