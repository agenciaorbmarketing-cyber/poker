// Monte Carlo worker: listens to start message with payload {hero, board, nPlayers, iterations}
// Posts progress and final result. Uses evaluator functions (embedded minimal copy).
self.addEventListener('message', (ev)=>{
  const m = ev.data;
  if(m.type === 'start'){ start(m.payload); }
  else if(m.type === 'stop'){ stopFlag=true; }
});
let stopFlag = false;
function parseCardSimple(txt){
  const t = txt.toUpperCase().replace(/\s+/g,'');
  const suit = t.slice(-1).toLowerCase();
  let rank = t.slice(0,-1);
  if(rank === 'T') rank = '10';
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const suits = ['s','h','d','c'];
  if(suits.indexOf(suit) === -1) throw 'suit';
  const rIdx = ranks.indexOf(rank);
  if(rIdx === -1) throw 'rank';
  return {rank:2+rIdx, suit};
}
function uniqueRanksSorted(cards){
  const set = new Set(cards.map(c=>c.rank));
  const arr = Array.from(set).sort((a,b)=>b-a);
  return arr;
}
function detectStraight(uniqueRanks){
  const rset = new Set(uniqueRanks);
  const ranksAll = uniqueRanks.slice();
  if(rset.has(14)) ranksAll.push(1);
  ranksAll.sort((a,b)=>b-a);
  for(let i=0;i<=ranksAll.length-5;i++){
    let ok=true;
    for(let j=0;j<4;j++){
      if(ranksAll[i+j] - ranksAll[i+j+1] !== 1){ ok=false; break; }
    }
    if(ok) return ranksAll[i];
  }
  return null;
}
function evaluate7(cards){
  const suitsMap = {};
  for(const c of cards){
    suitsMap[c.suit] = suitsMap[c.suit] || [];
    suitsMap[c.suit].push(c);
  }
  let flushSuit = null;
  for(const s in suitsMap){ if(suitsMap[s].length >=5) { flushSuit = s; break; } }
  const ranksCnt = {};
  for(const c of cards){ ranksCnt[c.rank] = (ranksCnt[c.rank]||0)+1; }
  const groups = Object.entries(ranksCnt).map(([r,c])=>({rank:parseInt(r),count:c})).sort((a,b)=>{
    if(b.count!==a.count) return b.count - a.count;
    return b.rank - a.rank;
  });
  const uniq = uniqueRanksSorted(cards);
  const straightHigh = detectStraight(uniq);
  if(flushSuit){
    const flushCards = suitsMap[flushSuit].map(c=>c.rank);
    const uniqFlush = Array.from(new Set(flushCards)).sort((a,b)=>b-a);
    if(uniqFlush.indexOf(14)!==-1) uniqFlush.push(1);
    const sfHigh = detectStraight(uniqFlush);
    if(sfHigh) return {category:8, tiebreak:[sfHigh]};
  }
  if(groups[0].count === 4){
    const fourRank = groups[0].rank;
    const kickers = uniq.filter(r=>r!==fourRank).slice(0,1);
    return {category:7, tiebreak:[fourRank,...kickers]};
  }
  if(groups[0].count === 3 && groups[1] && groups[1].count >=2){
    return {category:6, tiebreak:[groups[0].rank, groups[1].rank]};
  }
  if(flushSuit){
    const flushCards = suitsMap[flushSuit].map(c=>c.rank).sort((a,b)=>b-a).slice(0,5);
    return {category:5, tiebreak:flushCards};
  }
  if(straightHigh) return {category:4, tiebreak:[straightHigh]};
  if(groups[0].count === 3){
    const threeRank = groups[0].rank;
    const kickers = uniq.filter(r=>r!==threeRank).slice(0,2);
    return {category:3,tiebreak:[threeRank,...kickers]};
  }
  if(groups[0].count === 2 && groups[1] && groups[1].count === 2){
    const pair1 = groups[0].rank;
    const pair2 = groups[1].rank;
    const kicker = uniq.filter(r=>r!==pair1 && r!==pair2)[0];
    return {category:2,tiebreak:[pair1,pair2,kicker]};
  }
  if(groups[0].count === 2){
    const pair = groups[0].rank;
    const kickers = uniq.filter(r=>r!==pair).slice(0,3);
    return {category:1,tiebreak:[pair,...kickers]};
  }
  return {category:0,tiebreak:uniq.slice(0,5)};
}
function compareEval(a,b){
  if(a.category !== b.category) return a.category - b.category;
  for(let i=0;i<Math.max(a.tiebreak.length,b.tiebreak.length);i++){
    const ai=a.tiebreak[i]||0, bi=b.tiebreak[i]||0;
    if(ai!==bi) return ai-bi;
  }
  return 0;
}
function buildFullDeck(){
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const suits = ['s','h','d','c'];
  const list=[];
  for(const r of ranks) for(const s of suits) list.push(r+s);
  return list;
}
function removeCardsFromDeck(deck, cards){
  const s = new Set(cards.map(c=>c.toUpperCase()));
  return deck.filter(d=>!s.has(d.toUpperCase()));
}
function sampleRandom(arr, n){
  const copy = arr.slice();
  const out = [];
  for(let i=0;i<n;i++){
    const idx = Math.floor(Math.random()*copy.length);
    out.push(copy.splice(idx,1)[0]);
  }
  return out;
}
function toCardObj(str){
  return parseCardSimple(str);
}
function enumerateScenarios(hero, board, nPlayers, maxCombos=50000){
  const remaining = buildFullDeck().filter(c=>![hero[0].toUpperCase(),hero[1].toUpperCase(), ...board.map(b=>b.toUpperCase())].includes(c.toUpperCase()));
  const opp = nPlayers - 1;
  const choose = (arr,k) => {
    const res=[];
    function rec(start,cur){
      if(cur.length===k){ res.push(cur.slice()); return; }
      for(let i=start;i<arr.length;i++){ cur.push(arr[i]); rec(i+1,cur); cur.pop(); }
    }
    rec(0,[]); return res;
  };
  const totalNeeded = 2*opp;
  if(totalNeeded===0) return [];
  if(remaining.length < totalNeeded) return [];
  const combos = choose(remaining, totalNeeded);
  if(combos.length > maxCombos) return null;
  const scenarios = [];
  for(const combo of combos){
    const oppHands = [];
    for(let i=0;i<opp;i++){
      oppHands.push([combo[2*i], combo[2*i+1]]);
    }
    scenarios.push(oppHands);
  }
  return scenarios;
}
function confidenceInterval(p,n){
  const se = Math.sqrt(p*(1-p)/n);
  return [Math.max(0, p - 1.96*se), Math.min(1, p + 1.96*se)];
}
function start(payload){
  stopFlag = false;
  const hero = payload.hero;
  const board = payload.board || [];
  const nPlayers = payload.nPlayers;
  const iterations = payload.iterations;
  let calcType = 'montecarlo';
  let scenarios = null;
  if(board.length === 5){
    const maybe = enumerateScenarios(hero, board, nPlayers, 50000);
    if(maybe !== null){ scenarios = maybe; calcType='exact'; }
  }
  function showdownEval(heroCards, boardCards, oppHands){
    const heroSeven = [toCardObj(heroCards[0]), toCardObj(heroCards[1])].concat(boardCards.map(toCardObj));
    const heroEval = evaluate7(heroSeven);
    const oppEvals = [];
    for(const h of oppHands){
      const oppSeven = [toCardObj(h[0]), toCardObj(h[1])].concat(boardCards.map(toCardObj));
      oppEvals.push(evaluate7(oppSeven));
    }
    let best = heroEval;
    let winners = ['hero'];
    for(let i=0;i<oppEvals.length;i++){
      const cmp = compareEval(oppEvals[i], best);
      if(cmp > 0){ best = oppEvals[i]; winners = ['opp'+i]; }
      else if(cmp === 0){ winners.push('opp'+i); }
    }
    const heroBestCmp = compareEval(heroEval, best);
    if(heroBestCmp > 0) return {win:1, tie:0};
    const countWinners = (winners.includes('hero')) ? winners.length : winners.length;
    if(heroBestCmp === 0){
      const tieCount = winners.length;
      return {win:0, tie:1/tieCount};
    }
    return {win:0,tie:0};
  }
  if(calcType === 'exact'){
    let wins = 0, ties = 0, total = scenarios.length;
    for(let i=0;i<scenarios.length;i++){
      if(stopFlag) { postMessage({type:'stopped'}); return; }
      const oppHands = scenarios[i];
      const res = showdownEval(hero, board, oppHands);
      wins += res.win;
      ties += res.tie;
      if(i%5000===0) postMessage({type:'progress', progress: Math.round(i*100/scenarios.length)});
    }
    const equity = (wins + ties) / total;
    const ci = confidenceInterval(equity, total);
    postMessage({type:'result', equity, ci, wins, ties, iterationsRun: total, calcType, outs1: computeOuts(hero, board), p2: computeP2(hero, board)});
    return;
  }
  const fullDeck = buildFullDeck();
  const seen = new Set([hero[0].toUpperCase(), hero[1].toUpperCase(), ...board.map(b=>b.toUpperCase())]);
  const remaining = fullDeck.filter(c=>!seen.has(c.toUpperCase()));
  let wins=0, ties=0, total=0;
  const batch = 500;
  const maxIter = iterations;
  for(let it=0; it<maxIter; it++){
    if(stopFlag){ postMessage({type:'stopped'}); return; }
    const deck = remaining.slice();
    const oppHands = [];
    for(let p=0;p<nPlayers-1;p++){
      const a = Math.floor(Math.random()*deck.length); const c1 = deck.splice(a,1)[0];
      const b = Math.floor(Math.random()*deck.length); const c2 = deck.splice(b,1)[0];
      oppHands.push([c1,c2]);
    }
    const need = 5 - board.length;
    const boardAdd = [];
    for(let k=0;k<need;k++){
      const idx = Math.floor(Math.random()*deck.length);
      boardAdd.push(deck.splice(idx,1)[0]);
    }
    const fullBoard = board.concat(boardAdd);
    const res = showdownEval(hero, fullBoard, oppHands);
    wins += res.win;
    ties += res.tie;
    total++;
    if(total%batch===0){
      postMessage({type:'progress', progress: Math.round(total*100/maxIter)});
    }
  }
  const equity = (wins + ties) / total;
  const ci = confidenceInterval(equity, total);
  postMessage({type:'result', equity, ci, wins, ties, iterationsRun: total, calcType, outs1: computeOuts(hero, board), p2: computeP2(hero, board)});
}
function computeOuts(hero, board){
  const fullDeck = (function(){ const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A']; const suits=['s','h','d','c']; const list=[]; for(const r of ranks) for(const s of suits) list.push(r+s); return list; })();
  const seen = new Set([hero[0].toUpperCase(), hero[1].toUpperCase(), ...board.map(b=>b.toUpperCase())]);
  const remaining = fullDeck.filter(c=>!seen.has(c.toUpperCase()));
  const heroCards = [parseCardSimple(hero[0]), parseCardSimple(hero[1])];
  const curBoardObjs = board.map(parseCardSimple);
  const curEval = evaluate7(heroCards.concat(curBoardObjs.slice(0,5)));
  let outs = 0;
  for(const card of remaining){
    const newBoard = board.concat([card]);
    const newEval = evaluate7([parseCardSimple(hero[0]), parseCardSimple(hero[1])].concat(newBoard.map(parseCardSimple)));
    const cmp = compareEval(newEval, curEval);
    if(cmp > 0) outs++;
  }
  return outs;
}
function computeP2(hero, board){
  const knownCount = 2 + board.length;
  const outs = computeOuts(hero, board);
  const unseen = 52 - knownCount;
  if(unseen < 2) return 0;
  return 1 - ((unseen - outs)/unseen) * ((unseen - 1 - outs)/(unseen - 1));
}
