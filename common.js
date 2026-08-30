// 모든 페이지에서 공유하는 상단 네비게이션 + 로그인 상태 처리
import {
  auth,
  onAuthStateChanged,
  signOut,
  ensureUserProfile,
  getUserProfile,
  isAdminProfile,
} from "./firebase-init.js";

const SITE_TITLE = "종말예언 : 어둠탐사기록";

// 문서 목록(index.html/research.html) 정렬 옵션. 두 페이지가 같은 로직을 쓴다.
export const SORT_OPTIONS = [
  { key: "latest", label: "최신순" },
  { key: "likes", label: "추천순" },
  { key: "comments", label: "댓글순" },
];

// docs 배열을 정렬해서 새 배열로 반환한다. docs의 각 항목은 likeCount/commentCount와
// 서버에서 최신순(createdAt desc)으로 받아온 원래 순서를 나타내는 _order를 가지고 있어야
// 한다(loadDocs에서 부여). Firestore Timestamp 형태를 직접 비교하는 대신 _order를 쓰므로
// 최신순 정렬은 항상 서버가 준 순서와 정확히 같다.
export function sortDocs(docs, sortKey) {
  const arr = docs.slice();
  if (sortKey === "likes") {
    arr.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0) || a._order - b._order);
  } else if (sortKey === "comments") {
    arr.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0) || a._order - b._order);
  } else {
    arr.sort((a, b) => a._order - b._order);
  }
  return arr;
}

// 문서 분류 태그(소속/출처 세력). write.html의 체크박스와 목록/상세 페이지의 배지에서 공용으로 쓴다.
// 문서 하나에 상위 태그를 여러 개 동시에 붙일 수 있다(체크박스 다중 선택).
export const CATEGORIES = ["백일몽 주식회사", "초자연 재난관리국", "무명찬란교"];

const CATEGORY_CLASS = {
  "백일몽 주식회사": "tag-baekilmong",
  "초자연 재난관리국": "tag-jaenan",
  "무명찬란교": "tag-mumyeong",
};

// 상위 태그별 하위 분류 태그 목록. 상위 태그를 고르면 그 태그에 딸린 하위 태그만
// 체크박스로 보여준다(write.html).
export const SUBCATEGORIES = {
  "백일몽 주식회사": ["부서", "어둠", "사원"],
  "초자연 재난관리국": ["부서", "재난", "요원"],
  "무명찬란교": ["교단", "권능", "신도"],
};

// 문서 데이터에서 상위 카테고리 배열을 뽑아낸다. 다중 선택 이전에 만들어진
// 기존 문서는 category(단일 문자열) 필드만 가지고 있으므로 그 값을 배열로
// 감싸 하위 호환을 유지한다.
export function getDocCategories(docData) {
  if (!docData) return [];
  if (Array.isArray(docData.categories) && docData.categories.length) return docData.categories;
  if (docData.category) return [docData.category];
  return [];
}

export function getDocSubTags(docData) {
  return (docData && Array.isArray(docData.subTags)) ? docData.subTags : [];
}

// 하위 태그는 상위 태그별로 이름이 겹칠 수 있다(예: 백일몽 주식회사와 초자연
// 재난관리국 둘 다 "부서"를 갖는다). 그래서 저장은 "상위태그::하위태그" 형태의
// 합성 키로 하여, 어느 상위 태그에 딸린 하위 태그인지 구분한다. write.html의
// 체크박스 value와 문서에 저장되는 subTags 배열 모두 이 키를 그대로 쓴다.
const SUBTAG_SEP = "::";
export function makeSubTagKey(category, subtag) {
  return `${category}${SUBTAG_SEP}${subtag}`;
}
export function parseSubTagKey(key) {
  const idx = key.indexOf(SUBTAG_SEP);
  if (idx === -1) return { category: null, subtag: key };
  return { category: key.slice(0, idx), subtag: key.slice(idx + SUBTAG_SEP.length) };
}
export function subTagLabel(key) {
  return parseSubTagKey(key).subtag;
}

export function categoryBadge(category) {
  if (!category) return "";
  const cls = CATEGORY_CLASS[category] || "";
  return `<span class="doc-tag ${cls}">${escapeHtml(category)}</span>`;
}

// 문서 카드/상세에서 상위 태그 여러 개 + 하위 태그를 한 번에 배지로 렌더링한다.
export function categoryBadges(docData) {
  const cats = getDocCategories(docData).map((c) => categoryBadge(c));
  const subs = getDocSubTags(docData).map(
    (s) => `<span class="doc-tag doc-tag-sub">${escapeHtml(subTagLabel(s))}</span>`
  );
  return cats.concat(subs).join("");
}

function headerMarkup() {
  return `
    <div class="header-inner">
      <a class="brand" href="index.html">
        <img src="logo.png" alt="" class="brand-logo" />
        <span>${SITE_TITLE}</span>
      </a>
      <nav class="nav-actions">
        <a href="index.html">문서 목록</a>
        <a href="research.html">곽과장의 연구기록</a>
        <a href="write.html" id="nav-write">문서 작성</a>
        <span id="nav-admin-badge" class="admin-badge" hidden>관리자</span>
        <button id="nav-logout" class="link-button" hidden>로그아웃</button>
        <a id="nav-login" href="login.html">로그인</a>
      </nav>
    </div>
  `;
}

// mountHeader: 헤더를 그리고, 로그인 상태(user, profile)가 준비되면 onReady(user, profile)를 호출한다.
// requireAuth가 true면 로그인 안 된 사용자는 login.html로 보낸다.
export function mountHeader({ requireAuth = false, onReady } = {}) {
  const host = document.getElementById("app-header");
  if (host) host.innerHTML = headerMarkup();

  document.title = SITE_TITLE;

  onAuthStateChanged(auth, async (user) => {
    const logoutBtn = document.getElementById("nav-logout");
    const loginLink = document.getElementById("nav-login");
    const adminBadge = document.getElementById("nav-admin-badge");
    const writeLink = document.getElementById("nav-write");

    if (!user) {
      if (requireAuth) {
        const back = encodeURIComponent(location.pathname + location.search);
        location.href = `login.html?next=${back}`;
        return;
      }
      if (logoutBtn) logoutBtn.hidden = true;
      if (loginLink) loginLink.hidden = false;
      if (adminBadge) adminBadge.hidden = true;
      if (writeLink) writeLink.hidden = true;
      if (onReady) onReady(null, null);
      return;
    }

    const profile = await ensureUserProfile(user).catch(() => getUserProfile(user.uid));

    if (profile && profile.banned) {
      alert("이용이 제한된 계정입니다.");
      await signOut(auth);
      return;
    }

    if (logoutBtn) {
      logoutBtn.hidden = false;
      logoutBtn.onclick = async () => {
        await signOut(auth);
        location.href = "index.html";
      };
    }
    if (loginLink) loginLink.hidden = true;
    if (writeLink) writeLink.hidden = false;
    if (adminBadge) adminBadge.hidden = !isAdminProfile(profile);

    if (onReady) onReady(user, profile);
  });
}

// 게시물/댓글에 표시할 작성자 이름: 일반 유저에게는 전부 "이름"으로 통일,
// 관리자로 로그인한 경우에만 식별 번호를 함께 보여준다.
// number 값의 타입을 엄격히 검사하지 않는다 — Firestore 콘솔에서 수동으로 값을 만졌을 때
// 문자열("2")로 저장돼도 정상 표시되도록 값이 있는지만 확인한다.
export function displayAuthorName(viewerProfile, authorProfile) {
  if (!isAdminProfile(viewerProfile)) return "이름";
  const number = authorProfile && authorProfile.number;
  if (number !== undefined && number !== null && number !== "") {
    return `이름 #${number}`;
  }
  // 관리자에게는 프로필 문서 자체가 없거나 번호가 없는 경우를 구분해서 알려준다
  // (예: 이 계정이 회원가입 시 users 문서 생성에 실패한 경우).
  return "이름 (번호 없음)";
}

export function formatDate(ts) {
  if (!ts) return "";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
