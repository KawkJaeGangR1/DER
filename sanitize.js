// 문서 본문 HTML을 저장/출력하기 전에 허용된 태그·속성만 남기는 간단한 sanitizer.
// 외부 라이브러리 없이, 에디터가 만들어내는 결과물(굵게/기울임/빨간색/■검열)만
// 통과시키도록 화이트리스트 방식으로 구현한다.

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "FONT", "DIV", "P", "BR"]);

// span/font에 남길 수 있는 인라인 스타일: 붉은색 텍스트만 허용
function sanitizeStyle(styleValue) {
  if (!styleValue) return "";
  const colorMatch = /color\s*:\s*(#c0392b|#ff0000|red|rgb\(192,\s*57,\s*43\))/i.exec(styleValue);
  return colorMatch ? "color:#c0392b;" : "";
}

function sanitizeNode(node, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName;
  const children = Array.from(node.childNodes)
    .map((child) => sanitizeNode(child, doc))
    .filter(Boolean);

  if (!ALLOWED_TAGS.has(tag)) {
    // 허용되지 않는 태그는 벗겨내고 자식 내용만 유지한다.
    const frag = doc.createDocumentFragment();
    children.forEach((c) => frag.appendChild(c));
    return frag;
  }

  const outTag = tag === "FONT" ? "SPAN" : tag;
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
