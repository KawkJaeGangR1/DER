// 문서 본문 HTML을 저장/출력하기 전에 허용된 태그·속성만 남기는 간단한 sanitizer.
// 외부 라이브러리 없이, 에디터가 만들어내는 결과물(굵게/기울임/취소선/빨간색/■검열)만
// 통과시키도록 화이트리스트 방식으로 구현한다.

const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "FONT", "DIV", "P", "BR",
  "UL", "OL", "LI", "BLOCKQUOTE", "HR",
]);

// 내용째로 완전히 버려야 하는 태그(코드/스타일 소스가 텍스트로 새어 나오는 것을 막는다)
const DROP_TAGS = new Set([
  "SCRIPT", "STYLE", "HEAD", "TITLE", "META", "LINK", "NOSCRIPT", "TEMPLATE",
  "IFRAME", "OBJECT", "EMBED", "SVG",
]);

// 벗겨내되(태그만 제거) 블록 경계였다는 흔적은 남겨야 하는 태그 — 안 그러면
// 표/목록 등을 붙여넣었을 때 셀·항목 텍스트가 줄바꿈 없이 이어 붙어버린다.
const BLOCK_LIKE_TAGS = new Set([
  "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH",
  "DL", "DT", "DD",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "SECTION", "ARTICLE", "HEADER", "FOOTER", "PRE",
]);

// span/font에 남길 수 있는 인라인 스타일: 붉은색 텍스트만 허용.
// styleWithCSS 사용 여부·브라우저에 따라 "color:#c0392b;" 같은 style 속성 형태로 올 수도,
// <font color="#c0392b">처럼 속성값 하나만 올 수도 있어서, "color:" 접두어 없이도 매칭되게 느슨하게 검사한다.
function sanitizeStyle(rawValue) {
  if (!rawValue) return "";
  const isRed = /#c0392b|#ff0000|\bred\b|rgb\(\s*192\s*,\s*57\s*,\s*43\s*\)/i.test(rawValue);
  return isRed ? "color:#c0392b;" : "";
}

function sanitizeNode(node, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName;

  if (DROP_TAGS.has(tag)) {
    return null; // 스크립트/스타일 등은 내용까지 통째로 버린다
  }

  const children = Array.from(node.childNodes)
    .map((child) => sanitizeNode(child, doc))
    .filter(Boolean);

  if (!ALLOWED_TAGS.has(tag)) {
    // 허용되지 않는 태그는 벗겨내고 자식 내용만 유지한다.
    const frag = doc.createDocumentFragment();
    children.forEach((c) => frag.appendChild(c));
    if (BLOCK_LIKE_TAGS.has(tag)) {
      frag.appendChild(doc.createElement("br"));
    }
    return frag;
  }

  const outTag = tag === "FONT" ? "SPAN" : tag === "STRIKE" ? "S" : tag;
  const el = doc.createElement(outTag);

  if (outTag === "SPAN") {
    const cls = node.getAttribute("class");
    if (cls && cls.split(/\s+/).includes("redact")) {
      el.className = "redact";
    }
    const style = sanitizeStyle(node.getAttribute("style") || node.getAttribute("color"));
    if (style) el.setAttribute("style", style);
  }

  children.forEach((c) => el.appendChild(c));
  return el;
}

export function sanitizeHtml(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = parsed.getElementById("root");
  const out = document.createElement("div");
  Array.from(root.childNodes).forEach((child) => {
    const clean = sanitizeNode(child, document);
    if (clean) out.appendChild(clean);
  });
  return out.innerHTML;
}
