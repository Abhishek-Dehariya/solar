import Document, { Html, Head, Main, NextScript } from 'next/document';

// Sets the saved/system theme before first paint so there's no light/dark flash.
const THEME_SNIPPET = `
(function () {
  try {
    var t = localStorage.getItem('esenz-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();
`;

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body>
          <script dangerouslySetInnerHTML={{ __html: THEME_SNIPPET }} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}