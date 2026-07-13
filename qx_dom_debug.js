/*
 * Quantumult X script-response-body helper for local H5 layout debugging.
 *
 * The script is deliberately written in ES5 syntax for JavaScriptCore
 * compatibility. It only changes the response body and does not send data
 * anywhere.
 */

var CONFIG = {
  // Remove display:none, hidden attributes, and common hidden class names.
  revealHiddenElements: true,

  // Inject the mock button into the matching container, if present.
  injectMockButton: true,
  containerId: 'action-panel',

  // The fallback is used when the configured container is not found.
  fallbackToBody: true
};

var MOCK_BUTTON_HTML =
  '<button id="mock-btn" type="button" aria-label="测试办理" ' +
  'style="display:inline-block; box-sizing:border-box; min-height:44px; ' +
  'margin:12px 0; padding:10px 18px; border:0; border-radius:6px; ' +
  'background:#1769e0; color:#fff; font:600 16px/24px sans-serif; ' +
  'cursor:pointer;">测试办理</button>';

function revealHiddenElements(html) {
  // Change inline and embedded CSS declarations while preserving !important.
  html = html.replace(/display\s*:\s*none(\s*!\s*important)?/gi,
    function (match, important) {
      return 'display: block' + (important || '');
    });

  // Make the equivalent visibility rule visible as well.
  html = html.replace(/visibility\s*:\s*hidden(\s*!\s*important)?/gi,
    function (match, important) {
      return 'visibility: visible' + (important || '');
    });

  // Remove boolean hidden attributes from HTML tags.
  html = html.replace(
    /\s+hidden(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=\s|\/?\s*>)/gi,
    ''
  );

  // Keep accessibility state consistent with the visual state.
  html = html.replace(/\s+aria-hidden\s*=\s*("|')true\1/gi,
    ' aria-hidden="false"');

  // Remove common utility classes without touching similarly named classes.
  html = html.replace(
    /(<[a-z][^>]*\bclass\s*=\s*)("|')([\s\S]*?)\2([^>]*>)/gi,
    function (match, prefix, quote, className, suffix) {
      var visibleClasses = className
        .replace(/(^|\s)(?:hidden|is-hidden|d-none)(?=\s|$)/gi, '$1')
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s+|\s+$/g, '');
      return prefix + quote + visibleClasses + quote + suffix;
    }
  );

  return html;
}

function injectBeforeMatchingDivClose(html, containerId, buttonHtml) {
  var openTagPattern = new RegExp(
    "<div\\b[^>]*\\bid\\s*=\\s*[\"']" +
      escapeRegExp(containerId) + "[\"'][^>]*>", "i"
  );
  var openTag = openTagPattern.exec(html);

  if (!openTag) {
    return null;
  }

  // Count nested divs so injection happens before this container's own close.
  var tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = openTag.index + openTag[0].length;
  var depth = 1;
  var tag;

  while ((tag = tagPattern.exec(html)) !== null) {
    if (/^<\s*div\b/i.test(tag[0])) {
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        return html.slice(0, tag.index) + buttonHtml + html.slice(tag.index);
      }
    }
  }

  return null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectMockButton(html) {
  // Do not duplicate the test control if the response is processed twice.
  if (/\bid\s*=\s*["']mock-btn["']/i.test(html)) {
    return html;
  }

  var injected = injectBeforeMatchingDivClose(
    html,
    CONFIG.containerId,
    MOCK_BUTTON_HTML
  );

  if (injected !== null) {
    return injected;
  }

  if (CONFIG.fallbackToBody) {
    return html.replace(/<\/body\s*>/i, MOCK_BUTTON_HTML + '</body>');
  }

  return html;
}

var htmlString = ($response && typeof $response.body === 'string')
  ? $response.body
  : '';

if (CONFIG.revealHiddenElements) {
  htmlString = revealHiddenElements(htmlString);
}

if (CONFIG.injectMockButton) {
  htmlString = injectMockButton(htmlString);
}

$done({ body: htmlString });
