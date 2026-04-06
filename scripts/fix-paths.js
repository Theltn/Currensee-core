const fs = require('fs');

const files = [
  'client/index.html',
  'client/src/pages/AskAI.html',
  'client/src/pages/dashboard.html',
  'client/src/pages/LoginAuth.html',
  'client/src/pages/OptionsCenter.html',
  'client/src/pages/optionsPlayground.html',
  'client/src/pages/Portfolio.html'
];

files.forEach(f => {
  let cnt = fs.readFileSync(f, 'utf8');
  cnt = cnt.replace(/href="index\.html"/g, 'href="/index.html"');
  cnt = cnt.replace(/href="dashboard\.html"/g, 'href="/src/pages/dashboard.html"');
  cnt = cnt.replace(/href="OptionsCenter\.html"/g, 'href="/src/pages/OptionsCenter.html"');
  cnt = cnt.replace(/href="Portfolio\.html"/g, 'href="/src/pages/Portfolio.html"');
  cnt = cnt.replace(/href="AskAI\.html"/g, 'href="/src/pages/AskAI.html"');
  cnt = cnt.replace(/href="optionsPlayground\.html"/g, 'href="/src/pages/optionsPlayground.html"');
  cnt = cnt.replace(/href="LoginAuth\.html"/g, 'href="/src/pages/LoginAuth.html"');
  cnt = cnt.replace(/src="CurrenseeLogo\.png"/g, 'src="/CurrenseeLogo.png"');
  cnt = cnt.replace(/src="\.\/main\.js"/g, 'src="/src/main.js"');
  cnt = cnt.replace(/src="\.\/chart\.js"/g, 'src="/src/chart.js"');

  // LoginAuth.html redirection parameter
  cnt = cnt.replace(/LoginAuth\.html\?redirect=/g, '/src/pages/LoginAuth.html?redirect=');
  cnt = cnt.replace(/href="\/"/g, 'href="/index.html"'); // fixes root redirects implicitly

  fs.writeFileSync(f, cnt);
  console.log('Fixed', f);
});
