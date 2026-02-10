import { deck, cardList, parseCard, cardToString } from './evaluator.js';

const hero1 = document.getElementById('hero1');
const hero2 = document.getElementById('hero2');
const boardCardsEl = document.getElementById('board-cards');
const addCardBtn = document.getElementById('add-card');
const clearBoardBtn = document.getElementById('clear-board');
const nPlayersEl = document.getElementById('n-players');
const runBtn = document.getElementById('run');
const stopBtn = document.getElementById('stop');
const equityEl = document.getElementById('equity');
const ciEl = document.getElementById('ci');
const suggestionEl = document.getElementById('suggestion');
const calcTypeEl = document.getElementById('calc-type');
const spaceInfoEl = document.getElementById('space-info');
const outs1El = document.getElementById('outs1');
const p2El = document.getElementById('p2');
const progressEl = document.getElementById('progress');
const modeEl = document.getElementById('mode');
const iterationsEl = document.getElementById('iterations');
const detailedEl = document.getElementById('detailed');

let board = [];
let worker = null;

function populateCardSelect(selectEl){
  selectEl.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '--';
  selectEl.appendChild(empty);
  for(const c of cardList){
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    selectEl.appendChild(opt);
  }
}

populateCardSelect(hero1);
populateCardSelect(hero2);

function renderBoard(){
  boardCardsEl.innerHTML = '';
  board.forEach((c, i) => {
    const b = document.createElement('div');
    b.className = 'board-card';
    b.textContent = c;
    const rem = document.createElement('button');
    rem.textContent = 'x';
    rem.onclick = ()=>{ board.splice(i,1); renderBoard(); };
    b.appendChild(rem);
    boardCardsEl.appendChild(b);
  });
}

addCardBtn.onclick = ()=>{
  if(board.length >=5) return alert('Board máximo: 5 cartas');
  const choice = prompt('Digite a carta (ex.: As, Kh, 7d). Caps matters not.');
  if(!choice) return;
  const c = choice.trim();
  try{
    const pc = parseCard(c);
    const cs = cardToString(pc);
    if(board.includes(cs)) return alert('Carta já no board');
    board.push(cs);
    renderBoard();
  }catch(e){
    alert('Carta inválida. Use ex.: As Kh 7d 0r  (A,K,Q,J,10..2) e suits s,h,d,c');
  }
};

clearBoardBtn.onclick = ()=>{
  board = [];
  renderBoard();
};

function getSelectedHero(){
  const v1 = hero1.value;
  const v2 = hero2.value;
  if(!v1 || !v2) return null;
  if(v1 === v2) return null;
  return [v1, v2];
}

function disableRun(disabled){
  runBtn.disabled = disabled;
  stopBtn.disabled = !disabled;
}

function updateDetailedVisibility(){
  if(modeEl.value === 'detailed') detailedEl.classList.remove('hidden');
  else detailedEl.classList.add('hidden');
}
modeEl.onchange = updateDetailedVisibility;
updateDetailedVisibility();

function calcSpaceInfo(knownCards, nPlayers){
  const unseen = 52 - knownCards.length;
  const opp = nPlayers - 1;
  function comb(n,k){ if(k>n) return 0; let num=1,den=1; for(let i=0;i<k;i++){num*=n-i;den*=i+1;} return Math.round(num/den); }
  const combos = comb(unseen, 2*opp);
  return {unseen, combos};
}

runBtn.onclick = ()=>{
  const hero = getSelectedHero();
  if(!hero) return alert('Selecione suas duas cartas válidas.');
  const nPlayers = parseInt(nPlayersEl.value);
  if(isNaN(nPlayers) || nPlayers<2 || nPlayers>10) return alert('Número de jogadores inválido.');
  const iterations = parseInt(iterationsEl.value);
  if(isNaN(iterations) || iterations<100) return alert('Iterações inválidas.');

  const knownCards = [...board, hero[0], hero[1]];
  const space = calcSpaceInfo(knownCards, nPlayers);
  spaceInfoEl.textContent = `${space.unseen} cartas não vistas — combos aproximados de hole cards: ${space.combos}`;

  if(worker){ worker.terminate(); worker = null; }
  worker = new Worker('js/montecarlo.worker.js');
  disableRun(true);
  progressEl.textContent = '0%';
  equityEl.textContent = '—';
  ciEl.textContent = '—';
  suggestionEl.textContent = '—';
  outs1El.textContent = '—';
  p2El.textContent = '—';
  calcTypeEl.textContent = 'determinando...';

  const payload = {
    hero,
    board,
    nPlayers,
    iterations,
  };
  worker.postMessage({type:'start',payload});
  worker.onmessage = (ev)=>{
    const m = ev.data;
    if(m.type === 'progress'){
      progressEl.textContent = m.progress+'%';
    } else if(m.type === 'result'){
      disableRun(false);
      const { equity, ci, wins, ties, iterationsRun, calcType, outs1, p2 } = m;
      equityEl.textContent = (equity*100).toFixed(2)+'%';
      ciEl.textContent = (ci[0]*100).toFixed(2)+'% — '+(ci[1]*100).toFixed(2)+'%';
      calcTypeEl.textContent = calcType;
      progressEl.textContent = 'concluído';
      outs1El.textContent = outs1;
      p2El.textContent = (p2*100).toFixed(2)+'%';
      const suggestion = deriveSuggestion(equity, nPlayers);
      suggestionEl.textContent = suggestion;
    } else if(m.type === 'stopped'){
      disableRun(false);
      progressEl.textContent = 'parado';
    }
  };
};

stopBtn.onclick = ()=>{
  if(worker){ worker.postMessage({type:'stop'}); }
};

function deriveSuggestion(equity, nPlayers){
  let threshold = 1 / nPlayers;
  if(equity > threshold + 0.08) return 'Mão forte — vantagem matemática (educativa)';
  if(equity > threshold) return 'Mão disputada — pode seguir para estudo (educativa)';
  return 'Mão fraca — desmontre e estude possibilidades (educativa)';
}

(function presetExample(){
  hero1.value = 'As';
  hero2.value = 'Ks';
  board = ['Ah','7d','2c'];
  renderBoard();
})();
