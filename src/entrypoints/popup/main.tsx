import { render } from 'preact';

function Popup() {
  return <h1>{browser.i18n.getMessage('extName')}</h1>;
}

render(<Popup />, document.getElementById('app')!);
