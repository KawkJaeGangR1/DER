// Firebase 초기화 + 공용 헬퍼 함수
// Firebase JS SDK v10 (모듈형, CDN ESM) 사용 - 별도 빌드 과정 없이 GitHub Pages에서 바로 동작

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
};

// 유저 문서가 없으면 새로 만들고(가입 시점), 관리자만 볼 수 있는 식별 번호를 순번으로 부여한다.
// counters/userCounter 문서를 트랜잭션으로 증가시켜 번호 중복을 방지한다.
export async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    return existing.data();
  }

  const counterRef = doc(db, "counters", "userCounter");
  const number = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = counterSnap.exists() ? counterSnap.data().value + 1 : 1;
    tx.set(counterRef, { value: next });
    return next;
  });

  const profile = {
    number,
    role: "user",
    email: user.email,
    banned: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, profile);
  return profile;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export function isAdminProfile(profile) {
  return !!profile && profile.role === "admin";
}
