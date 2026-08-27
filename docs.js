// 괴담 문서 / 추천 / 댓글에 대한 Firestore 접근 함수 모음
import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const documentsCol = collection(db, "documents");

export async function listDocuments(max = 100) {
  const q = query(documentsCol, orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDocument(docId) {
  const snap = await getDoc(doc(db, "documents", docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDocument({ title, code, bodyHtml, authorUid }) {
  const ref = await addDoc(documentsCol, {
    title,
    code: code || "",
    bodyHtml,
    authorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(docId, { title, code, bodyHtml }) {
  await updateDoc(doc(db, "documents", docId), {
    title,
    code: code || "",
    bodyHtml,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(docId) {
  await deleteDoc(doc(db, "documents", docId));
}

// 추천(좋아요) : documents/{docId}/likes/{uid}
export async function getLikeCount(docId) {
  const snap = await getCountFromServer(collection(db, "documents", docId, "likes"));
  return snap.data().count;
}

export async function hasUserLiked(docId, uid) {
  const snap = await getDoc(doc(db, "documents", docId, "likes", uid));
  return snap.exists();
}

export async function setLiked(docId, uid, liked) {
  const ref = doc(db, "documents", docId, "likes", uid);
  if (liked) {
    await setDoc(ref, { createdAt: serverTimestamp() });
  } else {
    await deleteDoc(ref);
  }
}

// 댓글 : documents/{docId}/comments/{commentId}
export async function getCommentCount(docId) {
  const snap = await getCountFromServer(collection(db, "documents", docId, "comments"));
  return snap.data().count;
}

export async function listComments(docId) {
  const q = query(collection(db, "documents", docId, "comments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addComment(docId, { text, authorUid }) {
  await addDoc(collection(db, "documents", docId, "comments"), {
    text,
    authorUid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteComment(docId, commentId) {
  await deleteDoc(doc(db, "documents", docId, "comments", commentId));
}
