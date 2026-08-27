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

function headerMarkup() {
  return `
    <div class="header-inner">
      <a class="brand" href="index.html">
        <img src="logo.png" alt="" class="brand-logo" />
        <span>${SITE_TITLE}</span>
      </a>
      <nav class="nav-actions">
        <a href="index.html">문서 목록</a>
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
export function displayAuthorName(viewerProfile, authorProfile) {
  if (isAdminProfile(viewerProfile) && authorProfile && typeof authorProfile.number === "number") {
    return `이름 #${authorProfile.number}`;
  }
  return "이름";
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
